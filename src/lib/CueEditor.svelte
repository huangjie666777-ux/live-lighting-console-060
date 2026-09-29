<script lang="ts">
  import { consoleStore as s } from '../state/console';
  import { CHANNEL_COUNT } from '../engine/types';
  import { resolveTargets } from '../engine/cues';

  $: cue = s.cues[s.selectedIndex];
  $: targets = cue ? resolveTargets(s.cues, s.selectedIndex) : [];
  $: cueIssues = s.issues.filter((i) => i.cueId === cue?.id);
  $: running = s.running;
</script>

<section class="editor">
  <div class="list-head">
    <h3>节目 Cue（{s.cues.length}）</h3>
    <div class="ops">
      <button onclick={() => s.addCue()} disabled={running}>＋ 新增</button>
    </div>
  </div>
  {#if s.issues.length > 0 && !running}
    <div class="errors">⚠ {s.issues.length} 项非法输入，已禁止 GO，请修正后再运行。</div>
  {/if}
  <ol class="cue-list">
    {#each s.cues as c, i (c.id + ':' + i)}
      <li class="row" class:sel={i === s.selectedIndex} class:cur={i === s.cueIndex} class:next={i === s.nextCueIndex}>
        <button class="pick" onclick={() => s.select(i)} title="选中（可用于跳场）">
          <b>{c.id}</b> {c.name}
          <span class="meta">↑{c.fadeUp}s ↓{c.fadeDown}s{c.follow != null ? ` ⏱${c.follow}s` : ''}</span>
          {#if i === s.cueIndex}<em class="tag cur">当前</em>{/if}
          {#if i === s.nextCueIndex}<em class="tag next">下一</em>{/if}
        </button>
        {#if !running}
          <span class="row-ops">
            <button title="上移" onclick={() => s.move(i, -1)}>↑</button>
            <button title="下移" onclick={() => s.move(i, 1)}>↓</button>
            <button title="删除" onclick={() => s.deleteCue(i)}>✕</button>
          </span>
        {/if}
      </li>
    {/each}
  </ol>

  {#if cue}
    <div class="detail" class:locked={running}>
      <h3>编辑 {cue.id}{running ? '（运行中已锁定）' : ''}</h3>
      <div class="fields">
        <label>编号<input value={cue.id} oninput={(e) => s.updateCue(s.selectedIndex, { id: e.currentTarget.value })} /></label>
        <label class="grow">名称<input value={cue.name} oninput={(e) => s.updateCue(s.selectedIndex, { name: e.currentTarget.value })} /></label>
        <label>升光秒<input type="number" min="0" step="0.1" value={cue.fadeUp} oninput={(e) => s.updateCue(s.selectedIndex, { fadeUp: Number(e.currentTarget.value) })} /></label>
        <label>降光秒<input type="number" min="0" step="0.1" value={cue.fadeDown} oninput={(e) => s.updateCue(s.selectedIndex, { fadeDown: Number(e.currentTarget.value) })} /></label>
        <label>跟随等待(可空)<input type="number" min="0" step="0.1" value={cue.follow ?? ''} placeholder="手动 GO" oninput={(e) => s.updateCue(s.selectedIndex, { follow: e.currentTarget.value === '' ? null : Number(e.currentTarget.value) })} /></label>
      </div>
      {#if cueIssues.length > 0}
        <ul class="field-errors">
          {#each cueIssues as iss (iss.field + iss.message)}<li>✗ {iss.message}（{iss.field}）</li>{/each}
        </ul>
      {/if}
      <table class="levels">
        <thead><tr><th>灯号</th>{#each Array.from({ length: CHANNEL_COUNT }, (_, i) => i) as ch (ch)}<th>{ch + 1}</th>{/each}</tr></thead>
        <tbody>
          <tr><th>记录亮度</th>{#each Array.from({ length: CHANNEL_COUNT }, (_, ch) => ch) as ch (ch)}
            <td><input type="number" min="0" max="100" step="1" placeholder="继承" value={ch in cue.levels ? cue.levels[ch] : ''} oninput={(e) => s.setLevel(s.selectedIndex, ch, e.currentTarget.value)} /></td>
          {/each}</tr>
          <tr><th>解析目标</th>{#each targets as t, ch (ch)}<td class:zero={t === 0}>{Math.round(t)}</td>{/each}</tr>
        </tbody>
      </table>
      <p class="tip">亮度格留空 = 该灯继承前序 Cue（首条之前为 0）；填 0 = 显式熄灭。</p>
    </div>
  {/if}
</section>

<style>
  .editor { background: #191c24; border: 1px solid #2a2f3b; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .list-head { display: flex; justify-content: space-between; align-items: center; }
  h3 { margin: 0; font-size: 15px; }
  button { background: #262b37; color: #e6e9f0; border: 1px solid #3a4152; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 13px; }
  button:disabled { opacity: .4; cursor: not-allowed; }
  .errors { background: #3a2020; border: 1px solid #7a3030; color: #ffb0b0; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
  .cue-list { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; align-items: stretch; gap: 4px; }
  .pick { flex: 1; text-align: left; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #20242e; }
  .row.sel .pick { outline: 2px solid #2c67ff; }
  .row.cur .pick { border-color: #2a9d52; }
  .row.next .pick { border-color: #d8a52a; }
  .meta { color: #8b93a5; font-size: 12px; }
  .tag { font-style: normal; font-size: 11px; border-radius: 4px; padding: 0 6px; }
  .tag.cur { background: #1f7a3d; }
  .tag.next { background: #8a6410; }
  .row-ops { display: flex; gap: 3px; }
  .row-ops button { padding: 4px 7px; }
  .detail { border-top: 1px solid #2a2f3b; padding-top: 8px; }
  .detail.locked { opacity: .75; pointer-events: none; }
  .fields { display: flex; flex-wrap: wrap; gap: 8px; }
  .fields label { display: flex; flex-direction: column; font-size: 12px; color: #aeb6c6; gap: 2px; }
  .fields .grow { flex: 1; min-width: 160px; }
  input { background: #10131a; color: #e6e9f0; border: 1px solid #3a4152; border-radius: 6px; padding: 5px 8px; font-size: 13px; }
  .field-errors { margin: 4px 0; padding-left: 18px; color: #ff9a9a; font-size: 12px; }
  table.levels { border-collapse: collapse; font-size: 12px; width: 100%; display: block; overflow-x: auto; }
  .levels th, .levels td { border: 1px solid #2a2f3b; padding: 2px 4px; text-align: center; min-width: 46px; }
  .levels input { width: 48px; padding: 3px; text-align: center; }
  .levels td.zero { color: #777; }
  .tip { color: #8b93a5; font-size: 12px; margin: 2px 0; }
</style>
