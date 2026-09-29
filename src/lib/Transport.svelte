<script lang="ts">
  import { consoleStore as s } from '../state/console';
  $: current = s.cueIndex >= 0 ? s.cues[s.cueIndex] : null;
  $: next = s.nextCueIndex >= 0 ? s.cues[s.nextCueIndex] : null;
  const phaseLabel: Record<string, string> = {
    idle: '停止', fading: '渐变中', follow: '跟随等待', hold: '到位·待命', paused: '已暂停',
  };
</script>

<section class="transport">
  <div class="state">
    <span class="badge">{phaseLabel[s.phase]}</span>
    <div class="cue-line">当前：{current ? `${current.id} ${current.name}` : '—'}</div>
    <div class="cue-line next">下一：{next ? `${next.id} ${next.name}` : '（无）'}</div>
  </div>
  <div class="bars">
    <label>渐变进度
      <progress value={s.fadeProgress} max="1"></progress>
      <span>{Math.round(s.fadeProgress * 100)}%</span>
    </label>
    <label>跟随剩余
      <progress value={s.followTotal - s.followRemaining} max={s.followTotal || 1}></progress>
      <span>{s.followRemaining.toFixed(1)}s</span>
    </label>
  </div>
  <div class="buttons">
    <button class="go" onclick={() => s.goNext()}>GO ▶</button>
    <button onclick={() => s.goTo(s.selectedIndex)} title="执行列表中选中的 Cue">跳场至选中</button>
    {#if s.phase === 'paused'}
      <button onclick={() => s.resume()}>继续</button>
    {:else}
      <button onclick={() => s.pause()} disabled={s.phase !== 'fading' && s.phase !== 'follow'}>暂停</button>
    {/if}
    <button class="stop" onclick={() => s.stop()}>停止 ⏹</button>
  </div>
  <div class="master">
    <label>总控 <input type="range" min="0" max="100" value={s.master} oninput={(e) => (s.master = Number(e.currentTarget.value))} /> <b>{s.master}%</b></label>
    <button class:black={s.blackout} onclick={() => (s.blackout = !s.blackout)}>{s.blackout ? '解除黑场' : '黑场 BLACKOUT'}</button>
  </div>
</section>

<style>
  .transport { display: grid; gap: 10px; background: #191c24; border: 1px solid #2a2f3b; border-radius: 10px; padding: 12px; }
  .badge { display: inline-block; background: #2c67ff; color: #fff; border-radius: 6px; padding: 2px 10px; font-size: 13px; }
  .cue-line { margin-top: 4px; font-size: 14px; }
  .next { color: #97a0b3; }
  .bars label { display: grid; grid-template-columns: 80px 1fr 56px; align-items: center; gap: 8px; font-size: 12px; color: #aeb6c6; margin: 4px 0; }
  progress { width: 100%; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  button { background: #262b37; color: #e6e9f0; border: 1px solid #3a4152; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 14px; }
  button:hover:not(:disabled) { background: #303646; }
  button:disabled { opacity: .4; cursor: not-allowed; }
  .go { background: #1f7a3d; border-color: #2a9d52; font-weight: 700; }
  .stop { background: #7a2a2a; border-color: #a33; }
  .master { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .master input[type='range'] { width: 200px; }
  .black { background: #000; border-color: #ff5d5d; color: #ff5d5d; font-weight: 700; }
</style>
