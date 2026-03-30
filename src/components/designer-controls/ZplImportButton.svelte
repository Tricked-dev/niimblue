<script lang="ts">
  import type { LabelProps } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";

  interface Props {
    labelProps: LabelProps;
    onImageReady: (img: Blob) => void;
  }

  let { labelProps, onImageReady }: Props = $props();
  let importState = $state<"idle" | "processing" | "error">("idle");

  const onImportClicked = async () => {
    const mmToInchCoeff = 25.4;
    const dpmm = 8;
    const widthInches = labelProps.size.width / dpmm / mmToInchCoeff;
    const heightInches = labelProps.size.height / dpmm / mmToInchCoeff;

    const contents = await FileUtils.pickAndReadSingleTextFile("zpl");
    importState = "processing";

    try {
      const response = await fetch(
        `https://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${widthInches}x${heightInches}/0/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "image/png", "X-Quality": "bitonal" },
          body: contents,
        },
      );
      if (response.ok) {
        onImageReady(await response.blob());
        importState = "idle";
      } else {
        importState = "error";
      }
    } catch (e) {
      importState = "error";
      Toasts.error(e);
    }
  };
</script>

<button
  class="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors relative"
  title={$tr("editor.import.zpl")}
  onclick={onImportClicked}
>
  <MdIcon icon="picture_as_pdf" />
  {#if importState === "processing"}
    <span class="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></span>
  {:else if importState === "error"}
    <span class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
  {/if}
</button>
