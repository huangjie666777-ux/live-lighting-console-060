import { CHANNEL_COUNT, type Cue, type ValidationIssue } from './types';

export const clampLevel = (v: number): number => Math.min(100, Math.max(0, v));

/** 校验 Cue 列表：唯一编号、名称、数值合法性。 */
export function validateCues(cues: Cue[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  cues.forEach((cue) => {
    if (!cue.id.trim()) {
      issues.push({ cueId: cue.id, field: 'id', message: '编号不能为空' });
    } else if (ids.has(cue.id)) {
      issues.push({ cueId: cue.id, field: 'id', message: `编号重复：${cue.id}` });
    }
    ids.add(cue.id);
    if (!cue.name.trim()) {
      issues.push({ cueId: cue.id, field: 'name', message: '名称不能为空' });
    }
    if (!Number.isFinite(cue.fadeUp) || cue.fadeUp < 0) {
      issues.push({ cueId: cue.id, field: 'fadeUp', message: '升光秒数必须为非负数' });
    }
    if (!Number.isFinite(cue.fadeDown) || cue.fadeDown < 0) {
      issues.push({ cueId: cue.id, field: 'fadeDown', message: '降光秒数必须为非负数' });
    }
    if (cue.follow != null && (!Number.isFinite(cue.follow) || cue.follow < 0)) {
      issues.push({ cueId: cue.id, field: 'follow', message: '跟随等待必须为非负数或留空' });
    }
    for (const [key, value] of Object.entries(cue.levels)) {
      const channel = Number(key);
      if (!Number.isInteger(channel) || channel < 0 || channel >= CHANNEL_COUNT) {
        issues.push({ cueId: cue.id, field: `level:${key}`, message: `灯号 ${key} 非法` });
      }
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        issues.push({ cueId: cue.id, field: `level:${key}`, message: `灯 ${channel + 1} 亮度必须在 0 至 100 之间` });
      }
    }
  });
  return issues;
}

/** 按节目顺序解析某条 Cue 的 12 灯目标亮度（未记录继承，首条之前全零）。 */
export function resolveTargets(cues: Cue[], cueIndex: number): number[] {
  const base = new Array<number>(CHANNEL_COUNT).fill(0);
  for (let i = 0; i <= cueIndex; i++) {
    for (const [key, value] of Object.entries(cues[i].levels)) {
      base[Number(key)] = value;
    }
  }
  return base;
}

export function nextUnusedId(cues: Cue[]): string {
  let n = cues.length + 1;
  const existing = new Set(cues.map((c) => c.id));
  while (existing.has(`Q${n}`)) n++;
  return `Q${n}`;
}
