<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { csvParse } from "d3-dsv";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { type CsvParams } from "$/types";
  import { csvData } from "$/stores";

  let open = $state(false);

  interface Props {
    enabled: boolean;
    onPlaceholderPicked: (name: string) => void;
  }

  let { enabled = $bindable(), onPlaceholderPicked }: Props = $props();

  let placeholders = $state<string[]>([]);
  let rows = $state<number>(0);

  const parse = (csv: CsvParams) => {
    const result = csvParse(csv.data);
    placeholders = result.columns;
    rows = result.length;
  };

  $effect(() => {
    parse($csvData);
  });
</script>

<svelte:window onclick={() => open = false} />

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button
    class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {enabled ? 'bg-yellow-700 hover:bg-yellow-600 border-yellow-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}"
    onclick={() => open = !open}
    title={$tr("params.csv.title")}>
    <MdIcon icon="dataset" />
  </button>
  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 min-w-[300px]" style="width: 100vw; max-width: 450px;">
    <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{$tr("params.csv.title")}</div>
    <div class="p-3 text-zinc-500 text-xs">
      <div class="flex items-center gap-2 mb-2">
        <input class="w-4 h-4" type="checkbox" role="switch" id="enabled" bind:checked={enabled} />
        <label class="text-zinc-300" for="enabled">{$tr("params.csv.enabled")}</label>
      </div>

      <div class="mt-3">
        {$tr("params.csv.tip")}
      </div>

      <textarea
        class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 my-3"
        style="font-family: monospace; min-height: 240px;"
        bind:value={$csvData.data}
        oninput={() => (enabled = true)}></textarea>

      <div class="pt-1">
        {$tr("params.csv.rowsfound")} <strong>{rows}</strong>
      </div>
      <div class="pt-1 flex flex-wrap gap-1">
        {$tr("params.csv.placeholders")}
        {#each placeholders as p (p)}
          <button class="inline-flex items-center gap-1 px-1 h-5 rounded border border-blue-700 text-blue-400 hover:text-blue-300 text-xs transition-colors" onclick={() => onPlaceholderPicked(p)}
            >{`{${p}}`}
          </button>
        {/each}
      </div>
    </div>
  </div>
  {/if}
</div>
