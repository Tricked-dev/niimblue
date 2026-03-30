<script lang="ts">
  import { Datamatrix } from "$/fabric-object/datamatrix";

  interface Props {
    selectedDatamatrix: Datamatrix;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedDatamatrix, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision} />

<div class="flex flex-col gap-2">
  <div>
    <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Data</label>
    <input
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
      type="text"
      value={selectedDatamatrix.text}
      oninput={(e) => {
        selectedDatamatrix.set("text", e.currentTarget.value);
        valueUpdated();
      }} />
  </div>
  <div>
    <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cell Size</label>
    <input
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
      type="number"
      min="1"
      max="20"
      value={selectedDatamatrix.cellSize}
      oninput={(e) => {
        selectedDatamatrix.set("cellSize", e.currentTarget.valueAsNumber ?? 4);
        valueUpdated();
      }} />
  </div>
</div>
