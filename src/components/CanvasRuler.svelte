<script lang="ts">
  interface Highlight { start: number; end: number }

  interface Props {
    zoom: number;
    scrollOffset: number;
    dpmm: number;
    length: number;
    axis: "horizontal" | "vertical";
    highlight?: Highlight;
  }

  let { zoom, scrollOffset, dpmm, length, axis, highlight }: Props = $props();

  const THICKNESS = 18;
  const TICK_COLOR = "#45475a";
  const LABEL_COLOR = "#6c7086";
  const HL_COLOR = "rgba(96,165,250,0.35)"; // blue-400 faint

  const mmPx = $derived(zoom * dpmm);

  const tickSpacingMm = $derived(
    mmPx >= 16 ? 1 :
    mmPx >= 8  ? 2 :
    mmPx >= 4  ? 5 : 10
  );

  const labelSpacingMm = $derived(tickSpacingMm * 5);

  interface Tick { pos: number; major: boolean; label?: string }

  const startMm = $derived(scrollOffset / mmPx);
  const spanMm  = $derived(length / mmPx);

  const ticks = $derived.by<Tick[]>(() => {
    const result: Tick[] = [];
    const firstTick = Math.ceil(startMm / tickSpacingMm) * tickSpacingMm;
    for (let mm = firstTick; mm <= startMm + spanMm + tickSpacingMm; mm += tickSpacingMm) {
      const pos = (mm - startMm) * mmPx;
      if (pos < -1 || pos > length + 1) continue;
      const major = Math.round(mm * 1000) % Math.round(labelSpacingMm * 1000) === 0;
      result.push({ pos, major, label: major ? String(Math.round(mm)) : undefined });
    }
    return result;
  });
</script>

{#if axis === "horizontal"}
  <svg
    width={length}
    height={THICKNESS}
    style="display:block;flex-shrink:0;background:#1e1e2e;border-bottom:1px solid #313244"
  >
    {#if highlight}
      <rect
        x={highlight.start} y={0}
        width={highlight.end - highlight.start} height={THICKNESS}
        fill={HL_COLOR}
      />
      <line x1={highlight.start} y1={0} x2={highlight.start} y2={THICKNESS} stroke="rgba(96,165,250,0.7)" stroke-width="1" />
      <line x1={highlight.end}   y1={0} x2={highlight.end}   y2={THICKNESS} stroke="rgba(96,165,250,0.7)" stroke-width="1" />
    {/if}
    {#each ticks as tick}
      <line
        x1={tick.pos} y1={tick.major ? THICKNESS - 10 : THICKNESS - 6}
        x2={tick.pos} y2={THICKNESS}
        stroke={tick.major ? LABEL_COLOR : TICK_COLOR}
        stroke-width="1"
      />
      {#if tick.label}
        <text x={tick.pos + 2} y={THICKNESS - 11} fill={LABEL_COLOR} font-size="7" font-family="monospace">{tick.label}</text>
      {/if}
    {/each}
  </svg>
{:else}
  <svg
    width={THICKNESS}
    height={length}
    style="display:block;flex-shrink:0;background:#1e1e2e;border-right:1px solid #313244"
  >
    {#if highlight}
      <rect
        x={0} y={highlight.start}
        width={THICKNESS} height={highlight.end - highlight.start}
        fill={HL_COLOR}
      />
      <line x1={0} y1={highlight.start} x2={THICKNESS} y2={highlight.start} stroke="rgba(96,165,250,0.7)" stroke-width="1" />
      <line x1={0} y1={highlight.end}   x2={THICKNESS} y2={highlight.end}   stroke="rgba(96,165,250,0.7)" stroke-width="1" />
    {/if}
    {#each ticks as tick}
      <line
        x1={tick.major ? THICKNESS - 10 : THICKNESS - 6} y1={tick.pos}
        x2={THICKNESS}                                    y2={tick.pos}
        stroke={tick.major ? LABEL_COLOR : TICK_COLOR}
        stroke-width="1"
      />
      {#if tick.label}
        <text
          x={THICKNESS - 11} y={tick.pos - 2}
          fill={LABEL_COLOR} font-size="7" font-family="monospace"
          transform={`rotate(-90 ${THICKNESS - 11} ${tick.pos - 2})`}
        >{tick.label}</text>
      {/if}
    {/each}
  </svg>
{/if}
