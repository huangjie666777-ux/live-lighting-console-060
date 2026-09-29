<script lang="ts">
  import { consoleStore as s } from '../state/console';
  import { CHANNEL_COUNT } from '../engine/types';

  // 12 盏灯的舞台布点（上下两排灯位，光束投向舞台中央）
  const positions = Array.from({ length: CHANNEL_COUNT }, (_, i) => {
    const col = i % 6;
    const top = i < 6;
    return {
      x: 80 + col * 148,
      y: top ? 46 : 454,
      tx: 100 + col * 148,
      ty: top ? 250 : 250,
    };
  });
</script>

<div class="stage-wrap">
  <svg viewBox="0 0 960 500" class="stage" role="img" aria-label="12盏灯舞台示意图">
    <rect x="20" y="90" width="920" height="320" rx="18" class="floor" />
    {#each positions as pos, ch (ch)}
      {@const out = s.output[ch] ?? 0}
      {@const taken = s.takeover[ch]}
      {@const beam = out / 100}
      <polygon
        points="{pos.x - 12},{pos.y + (pos.y < 100 ? 18 : -18)} {pos.x + 12},{pos.y + (pos.y < 100 ? 18 : -18)} {pos.tx + 46},{pos.ty} {pos.tx - 46},{pos.ty}"
        fill="rgba(255,214,120,{0.38 * beam})"
      />
      <circle cx={pos.tx} cy={pos.ty} r="{26 + 30 * beam}" fill="rgba(255,224,150,{0.12 * beam})" />
      <g class="lamp" class:taken>
        <circle cx={pos.x} cy={pos.y} r="16" fill="hsl({40 + out * 1.6}, 95%, {12 + beam * 72}%)" stroke={taken ? '#ff5d5d' : '#888'} stroke-width="{taken ? 3 : 1.5}" />
        <text x={pos.x} y={pos.y + 4} text-anchor="middle" class="num">{ch + 1}</text>
        <text x={pos.x} y={pos.y + (pos.y < 100 ? -22 : 34)} text-anchor="middle" class="pct">{Math.round(out)}%</text>
      </g>
    {/each}
  </svg>
  <p class="hint">光束亮度为实际输出（总控后）；红圈 = 手动接管中。</p>
</div>

<style>
  .stage-wrap { background: #14161c; border-radius: 12px; padding: 8px; }
  .stage { width: 100%; height: auto; display: block; }
  .floor { fill: #1d2029; stroke: #333845; }
  .num { font-size: 12px; fill: #222; font-weight: 700; pointer-events: none; }
  .pct { font-size: 12px; fill: #aeb6c6; pointer-events: none; }
 .hint { margin: 4px 8px; color: #8b93a5; font-size: 12px; }
</style>
