<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  let open = $state(false);

  interface Props {
    selectedObject: fabric.FabricObject;
    valueUpdated: () => void;
  }

  let { selectedObject, valueUpdated }: Props = $props();

  const insertDateTime = (format?: string) => {
    let value = "{dt}";
    if (format) {
      value = `{dt|${format}}`;
    }

    if (selectedObject instanceof fabric.IText) {
      selectedObject.exitEditing();
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    } else if (selectedObject instanceof QRCode) {
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    } else if (selectedObject instanceof Barcode) {
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    }

    valueUpdated();
  };
</script>

<svelte:window onclick={() => open = false} />

<div class="relative flex items-stretch" role="group" title={$tr("params.variables.insert")} onclick={(e) => e.stopPropagation()}>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => open = !open}>
    <MdIcon icon="data_object" />
  </button>

  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 min-w-[300px] p-2">
    <div class="flex gap-1 flex-wrap">
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => insertDateTime()}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.datetime")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => insertDateTime("YYYY-MM-DD")}>
        <MdIcon icon="calendar_today" />
        {$tr("params.variables.insert.date")}
      </button>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => insertDateTime("HH:mm:ss")}>
        <MdIcon icon="schedule" />
        {$tr("params.variables.insert.time")}
      </button>
    </div>
  </div>
  {/if}
</div>
