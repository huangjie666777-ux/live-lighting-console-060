<script lang="ts">
  import StageView from './lib/StageView.svelte';
  import Transport from './lib/Transport.svelte';
  import CueEditor from './lib/CueEditor.svelte';
  import ManualChannels from './lib/ManualChannels.svelte';
  import { consoleStore as s } from './state/console';

  const examples = [
    '1. 选中 Q1 后点 GO：面光 4 秒升光，随后自动跟随 Q2、Q3（Q3 无跟随，停在待命）。',
    '2. 渐变进行中再点 GO：从当前实际亮度直接转向新 Cue 目标，不回弹到旧目标。',
    '3. 点暂停可冻结渐变与跟随倒计时，继续只走剩余时间；点停止立即全黑并清除接管。',
    '4. 勾选任意灯“手动接管”滑动调光，取消勾选立即回归基础；黑场按钮强制零输出。',
  ];
</script>

<main>
  <header>
    <h1>小剧场浏览器灯光走台控台</h1>
    {#if s.issues.length > 0}<span class="warn">存在 {s.issues.length} 项非法输入</span>{/if}
  </header>
  <div class="layout">
    <div class="left">
      <StageView />
      <Transport />
      <ManualChannels />
    </div>
    <div class="right">
      <CueEditor />
      <section class="examples">
        <h3>操作示例</h3>
        <ul>{#each examples as line (line)}<li>{line}</li>{/each}</ul>
      </section>
    </div>
  </div>
</main>

<style>
  :global(body) { margin: 0; background: #10131a; color: #e6e9f0; font-family: system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  main { max-width: 1280px; margin: 0 auto; padding: 16px; }
  header { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin: 0; }
  .warn { color: #ff9a9a; font-size: 13px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr); gap: 14px; align-items: start; }
  .left, .right { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .examples { background: #191c24; border: 1px solid #2a2f3b; border-radius: 10px; padding: 12px; font-size: 13px; }
  .examples ul { margin: 6px 0; padding-left: 18px; color: #c2c8d6; display: flex; flex-direction: column; gap: 4px; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
