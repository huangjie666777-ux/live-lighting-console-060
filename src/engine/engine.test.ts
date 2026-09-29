import { describe, expect, it } from 'vitest';
import { resolveTargets, validateCues } from './cues';
import { Playback } from './playback';
import { composeOutput } from './output';
import type { Cue } from './types';

const cue = (p: Partial<Cue>): Cue => ({
  id: 'Q', name: 'n', levels: {}, fadeUp: 1, fadeDown: 1, follow: null, ...p,
});

describe('Cue 解析与校验', () => {
  it('未记录灯继承前序，首条之前全零，显式零为熄灭', () => {
    const cues = [
      cue({ id: 'A', levels: { 0: 80 } }),
      cue({ id: 'B', levels: { 0: 0, 1: 50 } }),
    ];
    expect(resolveTargets(cues, 0)[0]).toBe(80);
    expect(resolveTargets(cues, 0)[5]).toBe(0);
    const t1 = resolveTargets(cues, 1);
    expect(t1[0]).toBe(0); // 显式熄灭
    expect(t1[1]).toBe(50);
  });

  it('跳路径不影响目标：先执行后面的 Cue 再跳前面的，目标仍按节目顺序解析', () => {
    const cues = [
      cue({ id: 'A', levels: { 0: 100 }, fadeUp: 0, fadeDown: 0 }),
      cue({ id: 'B', levels: { 1: 60 }, fadeUp: 0, fadeDown: 0 }),
    ];
    const pb = new Playback(() => cues);
    pb.go(1);
    pb.go(0);
    expect(pb.base[0]).toBe(100);
    expect(pb.base[1]).toBe(0); // Q1 不继承 Q2 的记录
  });

  it('非法输入定位到 Cue 与字段', () => {
    const cues = [cue({ id: 'X', name: '', fadeUp: -1, levels: { 0: 120 } }), cue({ id: 'X' })];
    const issues = validateCues(cues);
    expect(issues.map((i) => i.field)).toContain('name');
    expect(issues.map((i) => i.field)).toContain('fadeUp');
    expect(issues.some((i) => i.field.startsWith('level:'))).toBe(true);
    expect(issues.filter((i) => i.field === 'id')).toHaveLength(1);
  });
});

describe('播放计时', () => {
  it('按升/降时长逐灯线性过渡，零秒立即到位', () => {
    const cues = [cue({ fadeUp: 4, fadeDown: 2, levels: { 0: 100, 1: 0 } })];
    const pb = new Playback(() => cues);
    pb.base[1] = 100;
    pb.go(0);
    pb.tick(1);
    expect(pb.base[0]).toBeCloseTo(25); // 升 4s
    expect(pb.base[1]).toBeCloseTo(50); // 降 2s
    pb.tick(1);
    expect(pb.base[0]).toBeCloseTo(50);
    expect(pb.base[1]).toBe(0);
    pb.tick(5);
    expect(pb.base[0]).toBe(100);
  });

  it('渐变中再次 GO 从当时亮度接续，不回到旧目标', () => {
    const cues = [
      cue({ id: 'A', fadeUp: 10, levels: { 0: 100 } }),
      cue({ id: 'B', fadeUp: 10, fadeDown: 10, levels: { 0: 0 } }),
    ];
    const pb = new Playback(() => cues);
    pb.go(0);
    pb.tick(5); // 50
    expect(pb.base[0]).toBeCloseTo(50);
    pb.go(1); // 从 50 降到 0，需 5s
    pb.tick(10); // Q2 的降光时长为 10s
    expect(pb.base[0]).toBeCloseTo(0);
  });

  it('各灯到位后才跟随；大 dt 连续跟随不漏不漂', () => {
    const cues = [
      cue({ id: 'A', fadeUp: 0, fadeDown: 0, levels: { 0: 40 }, follow: 2 }),
      cue({ id: 'B', fadeUp: 2, fadeDown: 0, levels: { 0: 100 }, follow: 2 }),
      cue({ id: 'C', fadeUp: 0, fadeDown: 2, levels: { 0: 0 }, follow: null }),
    ];
    const pb = new Playback(() => cues);
    pb.go(0);
    expect(pb.cueIndex).toBe(0);
    expect(pb.phase).toBe('follow');
    // 跳过 100s：A→跟随2s→B(升2s)→跟随2s→C(降2s)，共 8s
    pb.tick(100);
    expect(pb.cueIndex).toBe(2);
    expect(pb.base[0]).toBe(0);
    expect(pb.phase).toBe('hold'); // 末项不再跟随
  });

  it('暂停冻结渐变与跟随，继续只推进剩余时间', () => {
    const cues = [
      cue({ fadeUp: 4, fadeDown: 0, levels: { 0: 100 }, follow: 4 }),
      cue({ id: 'Z', fadeUp: 0, fadeDown: 0, levels: {} }),
    ];
    const pb = new Playback(() => cues);
    pb.go(0);
    pb.tick(1);
    pb.pause();
    pb.tick(10);
    expect(pb.base[0]).toBeCloseTo(25);
    pb.resume();
    pb.tick(1);
    expect(pb.base[0]).toBeCloseTo(50);
    pb.tick(3); // 累计 5s：渐变在 4s 完成，跟随已过 1s，余 3s
    pb.pause();
    expect(pb.followRemaining).toBeCloseTo(3);
    pb.resume();
    pb.tick(2);
    expect(pb.followRemaining).toBeCloseTo(1);
  });

  it('停止回到全零', () => {
    const cues = [cue({ fadeUp: 0, fadeDown: 0, levels: { 3: 90 } })];
    const pb = new Playback(() => cues);
    pb.go(0);
    pb.stop();
    expect(pb.phase).toBe('idle');
    expect(pb.base.every((v) => v === 0)).toBe(true);
  });
});

describe('输出合成', () => {
  it('接管优先，总控相乘，黑场强制零', () => {
    const base = [80, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const manual = [10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const takeover = [true, false, false, false, false, false, false, false, false, false, false, false];
    expect(composeOutput(base, manual, takeover, 50, false).slice(0, 2)).toEqual([5, 20]);
    expect(composeOutput(base, manual, takeover, 100, true).every((v) => v === 0)).toBe(true);
  });
});
