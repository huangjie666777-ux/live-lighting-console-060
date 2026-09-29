import { Playback } from '../engine/playback';
import { composeOutput } from '../engine/output';
import { nextUnusedId, validateCues } from '../engine/cues';
import { CHANNEL_COUNT, type Cue } from '../engine/types';

const initialCues: Cue[] = [
  { id: 'Q1', name: '开场·面光暖起', levels: { 3: 60, 4: 60, 5: 60, 6: 60, 7: 60, 8: 60 }, fadeUp: 4, fadeDown: 2, follow: 6 },
  { id: 'Q2', name: '主角追光', levels: { 5: 100, 3: 0, 4: 20, 6: 20, 7: 0, 8: 0, 0: 30, 11: 30 }, fadeUp: 2, fadeDown: 3, follow: 5 },
  { id: 'Q3', name: '群舞蓝满台', levels: { 0: 80, 1: 80, 2: 80, 9: 80, 10: 80, 11: 80, 3: 40, 4: 40, 6: 40, 7: 40, 5: 60 }, fadeUp: 3, fadeDown: 3, follow: null },
  { id: 'Q4', name: '落幕黑场', levels: Object.fromEntries(Array.from({ length: CHANNEL_COUNT }, (_, i) => [i, 0])), fadeUp: 1, fadeDown: 5, follow: null },
];

export class ConsoleStore {
  cues = $state<Cue[]>(structuredClone(initialCues));
  running = $state(false);
  selectedIndex = $state(0);
  master = $state(100);
  blackout = $state(false);
  takeover = $state<boolean[]>(new Array(CHANNEL_COUNT).fill(false));
  manual = $state<number[]>(new Array(CHANNEL_COUNT).fill(0));
  phase = $state('idle');
  cueIndex = $state(-1);
  nextCueIndex = $state(-1);
  fadeProgress = $state(0);
  followRemaining = $state(0);
  followTotal = $state(0);
  base = $state<number[]>(new Array(CHANNEL_COUNT).fill(0));
  output = $state<number[]>(new Array(CHANNEL_COUNT).fill(0));
  issues = $derived(validateCues(this.cues));

  playback = new Playback(() => $state.snapshot(this.cues) as Cue[]);

  constructor() {
    $effect(() => {
      let raf = 0;
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (this.running && this.phase !== 'paused') this.playback.tick(dt);
        this.sync();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    });
  }

  private sync(): void {
    const s = this.playback.snapshot();
    this.phase = s.phase;
    this.cueIndex = s.cueIndex;
    this.nextCueIndex = s.nextCueIndex;
    this.fadeProgress = s.fadeProgress;
    this.followRemaining = s.followRemaining;
    this.followTotal = s.followTotal;
    this.base = s.base;
    this.output = composeOutput(s.base, this.manual, this.takeover, this.master, this.blackout);
  }

  goTo(index: number): void {
    if (!this.startIfNeeded()) return;
    this.playback.go(index);
    this.sync();
  }

  goNext(): void {
    if (!this.running) {
      if (!this.startIfNeeded()) return;
      this.playback.go(0);
    } else {
      this.playback.goNext();
    }
    this.sync();
  }

  private startIfNeeded(): boolean {
    if (this.issues.length > 0) return false;
    if (!this.running) this.running = true;
    return true;
  }

  pause(): void {
    this.playback.pause();
    this.sync();
  }

  resume(): void {
    this.playback.resume();
    this.sync();
  }

  stop(): void {
    this.playback.stop();
    this.running = false;
    this.takeover = new Array(CHANNEL_COUNT).fill(false);
    this.manual = new Array(CHANNEL_COUNT).fill(0);
    this.sync();
  }

  setTakeover(ch: number, on: boolean): void {
    const t = [...this.takeover];
    t[ch] = on;
    this.takeover = t;
    if (on) this.manual[ch] = this.base[ch];
    this.sync();
  }

  setManual(ch: number, value: number): void {
    this.manual[ch] = value;
    this.sync();
  }

  select(index: number): void {
    this.selectedIndex = index;
  }

  addCue(): void {
    if (this.running) return;
    const cue: Cue = {
      id: nextUnusedId(this.cues),
      name: '新 Cue',
      levels: {},
      fadeUp: 2,
      fadeDown: 2,
      follow: null,
    };
    this.cues = [...this.cues.slice(0, this.selectedIndex + 1), cue, ...this.cues.slice(this.selectedIndex + 1)];
    this.selectedIndex++;
  }

  deleteCue(index: number): void {
    if (this.running) return;
    this.cues = this.cues.filter((_, i) => i !== index);
    this.selectedIndex = Math.max(0, this.selectedIndex - (index <= this.selectedIndex ? 1 : 0));
  }

  move(index: number, dir: -1 | 1): void {
    if (this.running) return;
    const target = index + dir;
    if (target < 0 || target >= this.cues.length) return;
    const copy = [...this.cues];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    this.cues = copy;
    if (this.selectedIndex === index) this.selectedIndex = target;
    else if (this.selectedIndex === target) this.selectedIndex = index;
  }

  updateCue(index: number, patch: Partial<Cue>): void {
    if (this.running) return;
    this.cues[index] = { ...this.cues[index], ...patch };
  }

  setLevel(index: number, ch: number, text: string): void {
    if (this.running) return;
    const cue = this.cues[index];
    const levels = { ...cue.levels };
    if (text.trim() === '') {
      delete levels[ch];
    } else {
      levels[ch] = Number(text);
    }
    this.updateCue(index, { levels });
  }
}

export const consoleStore = new ConsoleStore();
