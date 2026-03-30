<script lang="ts">
  import type { LabelProps } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";

  interface Props {
    labelProps: LabelProps;
    onImageReady: (img: HTMLCanvasElement) => void;
  }

  let { labelProps, onImageReady }: Props = $props();
  let importState = $state<"idle" | "processing" | "error">("idle");

  const onImportClicked = async () => {
    const files = await FileUtils.pickFileAsync("pdf", false);
    const file = files[0];
    importState = "processing";

    try {
      const url = await FileUtils.blobToDataUrl(file);
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href;

      const loadingTask = pdfjsLib.getDocument(url);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);

      const el: HTMLCanvasElement = document.createElement("canvas");
      el.width = labelProps.size.width;
      const pdfScale = labelProps.size.width / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: pdfScale });
      el.height = viewport.height;
      await page.render({ canvas: el, viewport }).promise;

      onImageReady(el);
      importState = "idle";
    } catch (e) {
      importState = "error";
      Toasts.error(e);
    }
  };
</script>

<button
  class="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors relative"
  title={$tr("editor.import.pdf")}
  onclick={onImportClicked}
>
  <MdIcon icon="receipt_long" />
  {#if importState === "processing"}
    <span class="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></span>
  {:else if importState === "error"}
    <span class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
  {/if}
</button>
