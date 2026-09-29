import { CHANNEL_COUNT } from './types';

export interface OutputState {
  /** 最终 12 灯输出 0..100 */
  levels: number[];
  /** 各灯是否被手动接管 */
  takeover: boolean[];
}

/** 输出合成：先取手动接管值或基础渐变值，再乘总控比例；黑场强制全零。
 *  纯函数，便于测试。 */
export function composeOutput(
  base: number[],
  manual: number[],
  takeover: boolean[],
  master: number,
  blackout: boolean,
): number[] {
  const out = new Array<number>(CHANNEL_COUNT).fill(0);
  if (blackout) return out;
  const ratio = Math.min(1, Math.max(0, master / 100));
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const pre = takeover[ch] ? manual[ch] : base[ch];
    out[ch] = Math.min(100, Math.max(0, pre * ratio));
  }
  return out;
}
