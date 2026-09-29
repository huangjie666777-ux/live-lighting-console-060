<script lang="ts">
  import { consoleStore as s } from '../state/console';
  import { CHANNEL_COUNT } from '../engine/types';
</script>

<section class="manual">
  <h3>手动接管</h3>
  <div class="grid">
    {#each Array.from({ length: CHANNEL_COUNT }, (_, i) => i) as ch (ch)}
      <div class="ch" class:on={s.takeover[ch]}>
        <label class="tag"><input type="checkbox" checked={s.takeover[ch]} onchange={(e) => s.setTakeover(ch, e.currentTarget.checked)} /> 灯 {ch + 1}</label>
        <input type="range" min="0" max="100" value={s.manual[ch]} disabled={!s.takeover[ch]} oninput={(e) => s.setManual(ch, Number(e.currentTarget.value))} />
        <span>{s.takeover[ch] ? Math.round(s.manual[ch]) : Math.round(s.base[ch])}%</span>
      </div>
    {/each}
  </div>
  <p class="tip">勾选即接管该灯；取消勾选立即回到当时基础渐变值。接管不受暂停以外的基础渐变影响，总控与黑场仍然生效。</p>
</section>

<style>
  .manual h3 { margin: 0 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 14px; }
  .ch { display: grid; grid-template-columns: 64px 1fr 42px; align-items: center; gap: 6px; font-size: 12px; padding: 3px 6px; border-radius: 6px; }
  .ch.on { background: #2a2020; outline: 1px solid #6a3030; }
  .tag { display: flex; align-items: center; gap: 4px; }
  .tip { color: #8b93a5; font-size: 12px; }
</style>
