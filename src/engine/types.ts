export const CHANNEL_COUNT = 12;

/** 单条 Cue：levels 只记录发生变化的灯；未出现的灯继承前序 Cue。
 *  显式记录 0 表示熄灭（与“未记录、继承”区分）。 */
export interface Cue {
  id: string;
  name: string;
  /** key 为灯号 0..11，值 0..100；显式 0 = 熄灭 */
  levels: Record<number, number>;
  /** 升光秒数（当前低于目标的灯使用），>= 0 */
  fadeUp: number;
  /** 降光秒数（当前高于目标的灯使用），>= 0 */
  fadeDown: number;
  /** 跟随等待秒数，null/省略 = 等待手动 GO；>= 0 */
  follow?: number | null;
}

export type PlaybackPhase = 'idle' | 'fading' | 'follow' | 'hold' | 'paused';

export interface ChannelFadeState {
  from: number;
  to: number;
  duration: number;
  elapsed: number;
}

export interface ValidationIssue {
  cueId: string;
  field: string;
  message: string;
}
