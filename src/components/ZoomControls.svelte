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
    title="Zoom out (scroll down)"
    aria-label="Zoom out"
  >−</button>

  <button
    class="h-7 px-2 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-[10px] min-w-[46px]"
    onclick={() => canvas?.fitToWrapper()}
    title="Fit to screen (middle-click on canvas)"
    aria-label="Fit to screen"
  >{Math.round(zoom * 100)}%</button>

  <button
    class="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm leading-none"
    onclick={() => canvas?.virtualZoomIn()}
    title="Zoom in (scroll up)"
    aria-label="Zoom in"
  >+</button>
</div>
