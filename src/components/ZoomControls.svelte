<script lang="ts">
  import type { CustomCanvas } from "$/fabric-object/custom_canvas";

  interface Props {
    canvas: CustomCanvas | undefined;
    zoom: number;
  }

  let { canvas, zoom }: Props = $props();
</script>

<div class="flex items-center gap-1">
  <button
    class="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm leading-none"
    onclick={() => canvas?.virtualZoomOut()}
    title="Zoom out"
    aria-label="Zoom out"
  >−</button>

  <button
    class="h-7 px-2 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-[10px] min-w-[46px]"
    title="Zoom level"
    aria-label="Zoom level"
  >{Math.round(zoom * 100)}%</button>

  <button
    class="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm leading-none"
    onclick={() => canvas?.virtualZoomIn()}
    title="Zoom in"
    aria-label="Zoom in"
  >+</button>

  <button
    class="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400"
    onclick={() => canvas?.fitToWrapper()}
    title="Fit label to screen"
    aria-label="Fit label to screen"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 5h-5v2h7v-7h-2v5z"/>
    </svg>
  </button>
</div>
