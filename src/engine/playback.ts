import { CHANNEL_COUNT, type ChannelFadeState, type Cue, type PlaybackPhase } from './types';
import { resolveTargets } from './cues';

const easeLinear = (elapsed: number, duration: number): number =>
  duration <= 0 ? 1 : Math.min(1, elapsed / duration);

export interface PlaybackSnapshot {
  phase: PlaybackPhase;
  /** 当前正在执行的 Cue 下标；idle 为 -1 */
  cueIndex: number;
  /** 渐变完成后将执行的下标；fading/hold/follow 期间即 cueIndex 之后的下一条 */
  nextCueIndex: number;
  base: number[];
  fades: (ChannelFadeState | null)[];
  /** 整体渐变进度 0..1（取所有灯中最大耗时） */
  fadeProgress: number;
  followRemaining: number;
  followTotal: number;
}

/** 纯逻辑播放机：由外部帧循环调用 tick(dtSeconds)。
 *  GO / 跳场 / 暂停 / 继续 / 停止 都不依赖时钟，方便测试。 */
export class Playback {
  phase: PlaybackPhase = 'idle';
  cueIndex = -1;
  nextCueIndex = -1;
  base = new Array<number>(CHANNEL_COUNT).fill(0);
  fades: (ChannelFadeState | null)[] = new Array(CHANNEL_COUNT).fill(null);
  followRemaining = 0;
  followTotal = 0;
  private cuesFn: () => Cue[];

  constructor(cuesFn: () => Cue[]) {
    this.cuesFn = cuesFn;
  }

  private get cues(): Cue[] {
    return this.cuesFn();
  }

  /** 执行指定下标对应的 Cue；GO 时 index = cueIndex + 1。 */
  go(index: number): void {
  const cues = this.cues;
  if (index < 0 || index >= cues.length) return;
  // 目标始终按节目顺序从全零解析，与执行路径无关；起点是“当时基础亮度”。
  const targets = resolveTargets(cues, index);
    const cue = cues[index];
    const previousBase = [...this.base];
    const fades: (ChannelFadeState | null)[] = new Array(CHANNEL_COUNT).fill(null);
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const from = previousBase[ch];
    const to = targets[ch];
    if (from === to) continue;
    const duration = to > from ? cue.fadeUp : cue.fadeDown;
    fades[ch] = { from, to, duration: Math.max(0, duration), elapsed: 0 };
  }
  // 零秒过渡立即到位（仍不启动跟随，跟随从下一个 tick 开始）
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const f = fades[ch];
    if (f && f.duration === 0) {
      this.base[ch] = f.to;
      fades[ch] = null;
    }
  }
  this.cueIndex = index;
  this.nextCueIndex = index + 1 < cues.length ? index + 1 : -1;
  this.fades = fades;
  this.followRemaining = 0;
  this.followTotal = 0;
  this.phase = 'fading';
  if (this.fades.every((f) => f === null)) this.enterFollow();
  // 不在这里推进：首帧（含零秒过渡）由外部 tick 统一调度
}

  goNext(): void {
  this.go(this.cueIndex + 1);
}

  pause(): void {
  if (this.phase === 'fading' || this.phase === 'follow') this.phase = 'paused';
}

  resume(): void {
  if (this.phase !== 'paused') return;
  if (this.followTotal > 0 && this.followRemaining > 0) {
    this.phase = 'follow';
  } else if (this.fades.some((f) => f !== null)) {
    this.phase = 'fading';
  } else {
    this.phase = 'hold';
  }
}

  stop(): void {
  this.phase = 'idle';
  this.cueIndex = -1;
  this.nextCueIndex = -1;
  this.base = new Array<number>(CHANNEL_COUNT).fill(0);
  this.fades = new Array(CHANNEL_COUNT).fill(null);
  this.followRemaining = 0;
  this.followTotal = 0;
}

  /** 推进经过时间；dt 较大时会连续触发跟随链，不丢事件、不累积漂移。 */
  tick(dt: number): void {
    if (dt < 0 || !Number.isFinite(dt)) return;
    if (this.phase === 'paused' || this.phase === 'idle') return;

    let budget = dt;
    let guard = 0;
    while (guard++ < 10000) {
      if (this.phase === 'fading') {
        const active = this.fades
          .map((f, ch) => (f ? { f, ch } : null))
          .filter((x): x is { f: ChannelFadeState; ch: number } => x !== null);
        if (active.length === 0) {
          this.enterFollow();
          continue;
        }
        const need = Math.max(...active.map(({ f }) => Math.max(0, f.duration - f.elapsed)));
        const step = Math.min(budget, need);
        for (const { f, ch } of active) {
          f.elapsed += step;
          const p = easeLinear(f.elapsed, f.duration);
          this.base[ch] = p >= 1 ? f.to : f.from + (f.to - f.from) * p;
          if (p >= 1) this.fades[ch] = null;
        }
        budget -= step;
        if (this.fades.some((f) => f !== null)) return; // 帧时间耗尽，仍在渐变
        this.enterFollow(); // 所有灯到位，进入（零秒或计时）跟随
      } else if (this.phase === 'follow') {
        const waiting = this.followRemaining;
        if (budget < waiting && !(budget === 0 && waiting === 0)) {
          this.followRemaining = waiting - budget;
          return;
        }
        budget -= waiting;
        const next = this.nextCueIndex;
        if (next < 0) {
          this.followRemaining = 0;
          this.phase = 'hold';
          return;
        }
        this.go(next);
      } else {
        return; // hold / idle
      }
    }
  }

  /** 所有灯到位后进入跟随等待；零秒跟随在同一 tick 内链式执行。 */
  private enterFollow(): void {
    const cues = this.cues;
    const current = cues[this.cueIndex];
    if (current && current.follow != null && current.follow >= 0 && this.nextCueIndex >= 0) {
      this.followTotal = current.follow;
      this.followRemaining = current.follow;
      this.phase = 'follow';
    } else {
      this.followTotal = 0;
      this.followRemaining = 0;
      this.phase = 'hold';
    }
  }

  get fadeProgress(): number {
    const fades = this.fades.filter((f): f is ChannelFadeState => f !== null);
    if (fades.length === 0) return 1;
    return Math.min(1, Math.max(...fades.map((f) => easeLinear(f.elapsed, f.duration))));
  }

  snapshot(): PlaybackSnapshot {
    return {
      phase: this.phase,
      cueIndex: this.cueIndex,
      nextCueIndex: this.nextCueIndex,
      base: [...this.base],
      fades: this.fades.map((f) => (f ? { ...f } : null)),
      fadeProgress: this.fadeProgress,
      followRemaining: Math.max(0, this.followRemaining),
      followTotal: this.followTotal,
    };
  }
}
