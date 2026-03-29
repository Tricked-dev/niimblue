<script lang="ts">
  import { ArUcoMarker, type ArUcoDictionary } from "$/fabric-object/aruco";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";

  interface Props {
    selectedArUco: ArUcoMarker;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedArUco, editRevision, valueUpdated }: Props = $props();

  const dictOptions: { value: ArUcoDictionary; label: string; max: number }[] = [
    { value: "4x4", label: "4x4 (50)", max: 49 },
    { value: "5x5", label: "5x5 (50)", max: 49 },
    { value: "6x6", label: "6x6 (50)", max: 49 },
  ];

  let maxId = $derived(dictOptions.find((d) => d.value === selectedArUco.dictionary)?.max ?? 49);
</script>

<input type="hidden" value={editRevision}>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.aruco.dict")}>
    <MdIcon icon="grid_on" />
  </span>
  <select
    class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
    value={selectedArUco.dictionary}
    onchange={(e) => {
      selectedArUco?.set("dictionary", e.currentTarget.value);
      const newMax = dictOptions.find((d) => d.value === e.currentTarget.value)?.max ?? 49;
      if (selectedArUco.markerId > newMax) {
        selectedArUco?.set("markerId", 0);
      }
      valueUpdated();
    }}>
    {#each dictOptions as opt (opt.value)}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>

<div class="flex items-stretch flex-nowrap" style="width: fit-content">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.aruco.marker_id")}>
    <MdIcon icon="tag" />
  </span>
  <input
    type="number"
    class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    min="0"
    max={maxId}
    value={selectedArUco.markerId}
    oninput={(e) => {
      const val = parseInt(e.currentTarget.value);
      if (!isNaN(val) && val >= 0 && val <= maxId) {
        selectedArUco?.set("markerId", val);
        valueUpdated();
      }
    }} />
</div>
