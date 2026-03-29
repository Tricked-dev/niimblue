<script lang="ts">
  import { QRCode } from "$/fabric-object/qrcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    selectedQRCode: QRCode;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedQRCode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision}>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.qrcode.ecl")}>
    <MdIcon icon="auto_fix_high" />
  </span>
  <select
    class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
    value={selectedQRCode.ecl}
    onchange={(e) => {
      selectedQRCode?.set("ecl", e.currentTarget.value);
      valueUpdated();
    }}>
    <option value="L">Level L</option>
    <option value="M">Level M</option>
    <option value="Q">Level Q</option>
    <option value="H">Level H</option>
  </select>
</div>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.qrcode.mode")}>
    <MdIcon icon="abc" />
  </span>
  <select
    class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
    value={selectedQRCode.mode}
    onchange={(e) => {
      selectedQRCode?.set("mode", e.currentTarget.value);
      valueUpdated();
    }}>
    <option value="Byte">Byte</option>
    <option value="Numeric">Numeric</option>
    <option value="Alphanumeric">Alphanumeric</option>
    <option value="Kanji">Kanji</option>
  </select>
</div>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.qrcode.version")}>
    <MdIcon icon="123" />
  </span>
  <select
    class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
    value={selectedQRCode.qrVersion}
    onchange={(e) => {
      selectedQRCode?.set("qrVersion", parseInt(e.currentTarget.value));
      valueUpdated();
    }}>
    <option value={0}>Auto</option>
    {#each { length: 40 }, i (i)}
      <option value={i + 1}>{i + 1}</option>
    {/each}
  </select>
</div>

<textarea
  class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
  style="height: 100px"
  value={selectedQRCode.text}
  oninput={(e) => {
    selectedQRCode?.set("text", e.currentTarget.value);
    valueUpdated();
  }}></textarea>
