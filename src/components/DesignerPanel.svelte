<script lang="ts">
  import * as fabric from "fabric";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { connectionState } from "$/stores";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import BarcodeParamsControls from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import QRCodeParamsControls from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import ArUcoParamsControls from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";

  interface Props {
    canvas: fabric.Canvas | undefined;
    selectedObject: fabric.FabricObject | undefined;
    selectedCount: number;
    editRevision: number;
    onValueUpdated: () => void;
    onDeleteSelected: () => void;
    onCloneSelected: () => void;
    sheet?: boolean;
  }

  let {
    canvas,
    selectedObject,
    selectedCount,
    editRevision,
    onValueUpdated,
    onDeleteSelected,
    onCloneSelected,
    sheet = false,
  }: Props = $props();

  const hasText    = $derived(selectedObject instanceof fabric.IText);
  const hasBarcode = $derived(selectedObject instanceof Barcode);
  const hasQR      = $derived(selectedObject instanceof QRCode);
  const hasArUco   = $derived(selectedObject instanceof ArUcoMarker);
  const hasVar     = $derived(
    selectedObject instanceof fabric.IText ||
    selectedObject instanceof QRCode ||
    (selectedObject instanceof Barcode && (selectedObject as any).encoding === "CODE128B")
  );

  const sectionHeaderClass = "flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500";
  const deleteButtonClass = "w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors";
  const cloneButtonClass = "w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors";

  const objectSectionTitle = $derived(
    hasText ? "Text"
    : hasBarcode ? "Barcode"
    : hasQR ? "QR Code"
    : hasArUco ? "ArUco"
    : "Object"
  );

  // Mobile sheet state
  let sheetExpanded = $state(false);
  let activeTab = $state<"object" | "position" | "printer">("object");

  $effect(() => {
    if (selectedObject) sheetExpanded = true;
  });
</script>

{#if !sheet}
  <!-- Desktop panel -->
  <aside class="w-[220px] shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
    <div class="overflow-y-auto flex-1">

      {#if selectedCount > 0}
        <section class="border-b border-zinc-800">
          <div class={sectionHeaderClass}>
            <span>{objectSectionTitle}</span>
            <div class="flex items-center gap-1">
              <button class={cloneButtonClass} onclick={onCloneSelected} title="Clone">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </button>
              <button class={deleteButtonClass} onclick={onDeleteSelected} title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>
          <div class="px-3 pb-3 flex flex-col gap-2">
            {#if hasText}<TextParamsControls selectedText={selectedObject as fabric.IText} {editRevision} valueUpdated={onValueUpdated} />{/if}
            {#if hasBarcode}<BarcodeParamsControls selectedBarcode={selectedObject as Barcode} {editRevision} valueUpdated={onValueUpdated} />{/if}
            {#if hasQR}<QRCodeParamsControls selectedQRCode={selectedObject as QRCode} {editRevision} valueUpdated={onValueUpdated} />{/if}
            {#if hasArUco}<ArUcoParamsControls selectedArUco={selectedObject as ArUcoMarker} {editRevision} valueUpdated={onValueUpdated} />{/if}
            {#if selectedObject}<VectorParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />{/if}
            {#if hasVar}<VariableInsertControl {selectedObject} valueUpdated={onValueUpdated} />{/if}
          </div>
        </section>
      {/if}

      {#if selectedObject && selectedCount === 1}
        <section class="border-b border-zinc-800">
          <div class={sectionHeaderClass}>
            <span>Position &amp; Size</span>
          </div>
          <div class="px-3 pb-3 flex flex-col gap-2">
            <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
          </div>
        </section>
      {/if}

      <section class="border-b border-zinc-800">
        <div class={sectionHeaderClass}>
          <span>Printer</span>
          {#if $connectionState === "connected"}
            <span class="text-[9px] font-medium bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full">Connected</span>
          {/if}
        </div>
        <div class="px-3 pb-3 flex flex-col gap-2">
          <PrinterConnector />
        </div>
      </section>

    </div>
  </aside>
{:else}
  <!-- Mobile sheet -->
  <div
    class="bg-zinc-900 border-t border-zinc-800 transition-[height] duration-200"
    style="height: {sheetExpanded ? '50vh' : '36px'}; overflow: hidden;">

    <!-- Handle + tabs row -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="relative flex items-center h-9 border-b border-zinc-800 px-2 cursor-pointer select-none"
      onclick={() => sheetExpanded = !sheetExpanded}>
      <div class="absolute left-1/2 -translate-x-1/2 top-1.5 w-8 h-1 rounded-full bg-zinc-700"></div>
      {#if sheetExpanded}
        {#each (["object", "position", "printer"] as const) as tab}
          <button
            class="px-3 h-full text-xs border-b-2 transition-colors z-10 {activeTab === tab ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}"
            onclick={(e) => { e.stopPropagation(); activeTab = tab; sheetExpanded = true; }}
          >{tab === "object" ? "Object" : tab === "position" ? "Position" : "Printer"}</button>
        {/each}
      {:else}
        <span class="text-[10px] text-zinc-500 ml-auto">
          {selectedCount > 0 ? `${selectedCount} selected · tap to edit` : "tap to open panel"}
        </span>
      {/if}
    </div>

    <!-- Tab content -->
    {#if sheetExpanded}
      <div class="overflow-y-auto p-3" style="height: calc(50vh - 36px)">
        {#if activeTab === "object"}
          {#if selectedCount > 0}
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{objectSectionTitle}</span>
              <div class="flex items-center gap-1">
                <button class={cloneButtonClass} onclick={onCloneSelected} title="Clone">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
                <button class={deleteButtonClass} onclick={onDeleteSelected} title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              {#if hasText}<TextParamsControls selectedText={selectedObject as fabric.IText} {editRevision} valueUpdated={onValueUpdated} />{/if}
              {#if hasBarcode}<BarcodeParamsControls selectedBarcode={selectedObject as Barcode} {editRevision} valueUpdated={onValueUpdated} />{/if}
              {#if hasQR}<QRCodeParamsControls selectedQRCode={selectedObject as QRCode} {editRevision} valueUpdated={onValueUpdated} />{/if}
              {#if hasArUco}<ArUcoParamsControls selectedArUco={selectedObject as ArUcoMarker} {editRevision} valueUpdated={onValueUpdated} />{/if}
              {#if selectedObject}<VectorParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />{/if}
              {#if hasVar}<VariableInsertControl {selectedObject} valueUpdated={onValueUpdated} />{/if}
            </div>
          {:else}
            <p class="text-xs text-zinc-500">Select an object to edit its properties</p>
          {/if}
        {:else if activeTab === "position"}
          {#if selectedObject && selectedCount === 1}
            <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
          {:else}
            <p class="text-xs text-zinc-500">Select an object to edit its position</p>
          {/if}
        {:else}
          <PrinterConnector />
        {/if}
      </div>
    {/if}

  </div>
{/if}
