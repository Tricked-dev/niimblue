<script lang="ts">
  import { type LabelProps, type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";

  let open = $state(false);

  interface Props {
    onSubmit: (i: OjectType) => void;
    labelProps: LabelProps;
    zplImageReady: (img: Blob) => void;
    pdfImageReady: (img: HTMLCanvasElement) => void;
  }

  let { onSubmit, labelProps, zplImageReady, pdfImageReady }: Props = $props();
</script>

<svelte:window onclick={() => open = false} />

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => open = !open}>
    <MdIcon icon="format_shapes" />
    <MdIcon icon="add" />
  </button>

  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1" style="width: 100vw; max-width: 450px;">
    <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{$tr("editor.objectpicker.title")}</div>
    <div class="p-3 flex flex-wrap gap-1">
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("text")}>
        <MdIcon icon="title" />
        {$tr("editor.objectpicker.text")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("line")}>
        <MdIcon icon="remove" />
        {$tr("editor.objectpicker.line")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("rectangle")}>
        <MdIcon icon="crop_square" />
        {$tr("editor.objectpicker.rectangle")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("circle")}>
        <MdIcon icon="radio_button_unchecked" />
        {$tr("editor.objectpicker.circle")}
      </button>

      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("image")}>
        <MdIcon icon="image" />
        {$tr("editor.objectpicker.image")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("qrcode")}>
        <MdIcon icon="qr_code_2" />
        {$tr("editor.objectpicker.qrcode")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("aruco")}>
        <MdIcon icon="grid_on" />
        {$tr("editor.objectpicker.aruco")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => onSubmit("barcode")}>
        <MdIcon icon="view_week" />
        {$tr("editor.objectpicker.barcode")}
      </button>

      <ZplImportButton {labelProps} onImageReady={zplImageReady} />

      <PdfImportButton {labelProps} onImageReady={pdfImageReady} />
    </div>
  </div>
  {/if}
</div>
