<script lang="ts">
  import { Barcode } from "$/fabric-object/barcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    selectedBarcode: Barcode;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedBarcode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision}>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.barcode.encoding")}><MdIcon icon="code" /></span>
  <select
    class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
    value={selectedBarcode.encoding}
    onchange={(e) => {
      selectedBarcode?.set("encoding", e.currentTarget.value ?? "EAN13");
      valueUpdated();
    }}>
    <option value="EAN13">EAN13</option>
    <option value="CODE128B">Code128 B</option>
  </select>
</div>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.barcode.scale")}>
    <MdIcon icon="settings_ethernet" />
  </span>
  <input
    class="w-16 bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    type="number"
    min="1"
    value={selectedBarcode.scaleFactor}
    oninput={(e) => {
      selectedBarcode?.set("scaleFactor", e.currentTarget.valueAsNumber ?? 1);
      valueUpdated();
    }} />
</div>

<button
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedBarcode.printText ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  title={$tr("params.barcode.enable_caption")}
  onclick={() => {
    selectedBarcode?.set("printText", !selectedBarcode.printText);
    valueUpdated();
  }}>
  123
</button>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.barcode.font_size")}>
    <MdIcon icon="format_size" />
  </span>
  <input
    class="w-16 bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    type="number"
    min="1"
    value={selectedBarcode.fontSize}
    oninput={(e) => {
      selectedBarcode?.set("fontSize", e.currentTarget.valueAsNumber ?? 12);
      valueUpdated();
    }} />
</div>

<textarea
  class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
  style="height: 100px"
  value={selectedBarcode.text}
  oninput={(e) => {
    selectedBarcode?.set("text", e.currentTarget.value);
    valueUpdated();
  }}></textarea>
