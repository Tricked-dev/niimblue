<script lang="ts">
  import * as fabric from "fabric";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Datamatrix } from "$/fabric-object/datamatrix";
  import { connectionState, appConfig } from "$/stores";
  import { locale, locales } from "$/utils/i18n";
  import type { OjectType } from "$/types";
  import type { MaterialIcon } from "$/styles/mdi_icons";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import BarcodeParamsControls from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import QRCodeParamsControls from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import ArUcoParamsControls from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import DatamatrixParamsControls from "$/components/designer-controls/DatamatrixParamsControls.svelte";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { toolButtons } from "$/utils/object_tool_buttons";

  interface Props {
    canvas: fabric.Canvas | undefined;
    selectedObject: fabric.FabricObject | undefined;
    selectedCount: number;
    editRevision: number;
    onValueUpdated: () => void;
    onDeleteSelected: () => void;
    onCloneSelected: () => void;
    onObjectPicked?: (type: OjectType) => void;
    onPreview?: () => void;
    onPrint?: () => void;
    onLabelSettingsOpen?: () => void;
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
    onObjectPicked,
    onPreview,
    onPrint,
    onLabelSettingsOpen,
    sheet = false,
  }: Props = $props();

  const hasText = $derived(selectedObject instanceof fabric.IText);
  const hasBarcode = $derived(selectedObject instanceof Barcode);
  const hasQR = $derived(selectedObject instanceof QRCode);
  const hasArUco = $derived(selectedObject instanceof ArUcoMarker);
  const hasDatamatrix = $derived(selectedObject instanceof Datamatrix);
  const hasVar = $derived(
    selectedObject instanceof fabric.IText ||
      selectedObject instanceof QRCode ||
      (selectedObject instanceof Barcode && (selectedObject as any).encoding === "CODE128B"),
  );

  const sectionHeaderClass =
    "flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500";
  const deleteButtonClass =
    "w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors";
  const cloneButtonClass =
    "w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors";

  const addBtnClass =
    "flex flex-col items-center justify-center flex-1 h-14 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors";

  const objectSectionTitle = $derived(
    hasText
      ? "Text"
      : hasBarcode
        ? "Barcode"
        : hasQR
          ? "QR Code"
          : hasArUco
            ? "ArUco"
            : hasDatamatrix
              ? "Datamatrix"
              : "Object",
  );

  // Mobile sheet state
  let sheetExpanded = $state(true);
  let activeTab = $state<"add" | "object" | "position" | "printer" | "language">("add");

  $effect(() => {
    if (selectedObject) {
      activeTab = "object";
      sheetExpanded = true;
    }
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                  ><path
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
              </button>
              <button class={deleteButtonClass} onclick={onDeleteSelected} title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                  ><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </button>
            </div>
          </div>
          <div class="px-3 pb-3 flex flex-col gap-2">
            {#if hasText}<TextParamsControls
                selectedText={selectedObject as fabric.IText}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
            {#if hasBarcode}<BarcodeParamsControls
                selectedBarcode={selectedObject as Barcode}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
            {#if hasQR}<QRCodeParamsControls
                selectedQRCode={selectedObject as QRCode}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
            {#if hasArUco}<ArUcoParamsControls
                selectedArUco={selectedObject as ArUcoMarker}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
            {#if hasDatamatrix}<DatamatrixParamsControls
                selectedDatamatrix={selectedObject as Datamatrix}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
            {#if selectedObject}<VectorParamsControls
                {selectedObject}
                {editRevision}
                valueUpdated={onValueUpdated} />{/if}
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

      <!-- Settings section -->
      <section class="border-b border-zinc-800">
        <div class={sectionHeaderClass}>
          <span>Settings</span>
        </div>
        <div class="px-3 pb-3 flex flex-col gap-3">
          <!-- Visual Grid toggle -->
          <label class="flex items-center justify-between gap-2 cursor-pointer">
            <span class="text-xs text-zinc-400">Visual grid</span>
            <button
              class="w-8 h-4 rounded-full transition-colors relative {$appConfig.visualGrid
                ? 'bg-blue-600'
                : 'bg-zinc-700'}"
              onclick={() => appConfig.update((c) => ({ ...c, visualGrid: !c.visualGrid }))}>
              <span
                class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform {$appConfig.visualGrid
                  ? 'translate-x-4'
                  : ''}"></span>
            </button>
          </label>

          <!-- Move snap -->
          <div>
            <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Move snap (px)</label>
            <input
              class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
              type="number"
              min="0"
              max="50"
              value={$appConfig.moveSnap}
              oninput={(e) => {
                const v = e.currentTarget.valueAsNumber;
                appConfig.update((c) => ({
                  ...c,
                  moveSnap: isNaN(v) ? 0 : v,
                  resizeSnap: c.snapLock ? (isNaN(v) ? 0 : v) : c.resizeSnap,
                }));
              }} />
          </div>

          <!-- Snap lock toggle -->
          <label class="flex items-center justify-between gap-2 cursor-pointer">
            <span class="text-xs text-zinc-400">Lock snap values</span>
            <button
              class="w-8 h-4 rounded-full transition-colors relative {$appConfig.snapLock
                ? 'bg-blue-600'
                : 'bg-zinc-700'}"
              onclick={() => appConfig.update((c) => ({ ...c, snapLock: !c.snapLock }))}>
              <span
                class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform {$appConfig.snapLock
                  ? 'translate-x-4'
                  : ''}"></span>
            </button>
          </label>

          {#if !$appConfig.snapLock}
            <div>
              <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Resize snap (px)</label>
              <input
                class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                type="number"
                min="0"
                max="50"
                value={$appConfig.resizeSnap}
                oninput={(e) => {
                  const v = e.currentTarget.valueAsNumber;
                  appConfig.update((c) => ({ ...c, resizeSnap: isNaN(v) ? 0 : v }));
                }} />
            </div>
          {/if}

          <!-- Factory reset -->
          <button
            class="w-full h-7 rounded border border-red-800 text-red-400 text-xs hover:bg-red-900/30 transition-colors"
            onclick={() => {
              if (confirm("Reset all settings to defaults?")) {
                appConfig.set({
                  fitMode: "stretch",
                  iconListMode: "both",
                  moveSnap: 5,
                  resizeSnap: 5,
                  snapLock: true,
                  visualGrid: false,
                  nonPrintableColor: "#CFCFCF",
                });
              }
            }}>
            Factory Reset
          </button>
        </div>
      </section>
    </div>
  </aside>
{:else}
  <!-- Mobile sheet -->
  <div
    class="bg-zinc-900 border-t border-zinc-800 transition-[height] duration-200"
    style="height: {sheetExpanded ? '50vh' : '36px'}; overflow: hidden; padding-bottom: env(safe-area-inset-bottom);">
    <!-- Handle + tabs row -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="relative flex items-center h-9 border-b border-zinc-800 px-2 cursor-pointer select-none"
      onclick={() => (sheetExpanded = !sheetExpanded)}>
      <div class="absolute left-1/2 -translate-x-1/2 top-1.5 w-8 h-1 rounded-full bg-zinc-700"></div>
      {#if sheetExpanded}
        {#each ["add", "object", "position", "printer", "language"] as const as tab}
          <button
            class="px-3 h-full text-xs border-b-2 transition-colors z-10 {activeTab === tab
              ? 'border-blue-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'}"
            onclick={(e) => {
              e.stopPropagation();
              activeTab = tab;
              sheetExpanded = true;
            }}
            >{tab === "add"
              ? "Add"
              : tab === "object"
                ? "Object"
                : tab === "position"
                  ? "Position"
                  : tab === "printer"
                    ? "Printer"
                    : "Language"}</button>
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
        {#if activeTab === "add"}
          <div class="grid grid-cols-4 gap-1 px-1">
            {#each toolButtons as { type, icon, title } (type)}
              <button
                class={addBtnClass}
                {title}
                onclick={() => {
                  onObjectPicked?.(type);
                  sheetExpanded = false;
                }}>
                <MdIcon {icon} class="text-lg mb-0.5" />
                <span class="text-[9px]">{title}</span>
              </button>
            {/each}
          </div>
          <hr class="border-zinc-700 my-3" />
          <button
            class="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
            onclick={(e) => { e.stopPropagation(); onLabelSettingsOpen?.(); }}>
            <MdIcon icon="settings" />
            Label Settings
          </button>
        {:else if activeTab === "object"}
          {#if selectedCount > 0}
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{objectSectionTitle}</span>
              <div class="flex items-center gap-1">
                <button class={cloneButtonClass} onclick={onCloneSelected} title="Clone">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                    ><path
                      d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
                </button>
                <button class={deleteButtonClass} onclick={onDeleteSelected} title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                    ><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              {#if hasText}<TextParamsControls
                  selectedText={selectedObject as fabric.IText}
                  {editRevision}
                  valueUpdated={onValueUpdated} />{/if}
              {#if hasBarcode}<BarcodeParamsControls
                  selectedBarcode={selectedObject as Barcode}
                  {editRevision}
                  valueUpdated={onValueUpdated} />{/if}
              {#if hasQR}<QRCodeParamsControls
                  selectedQRCode={selectedObject as QRCode}
                  {editRevision}
                  valueUpdated={onValueUpdated} />{/if}
              {#if hasArUco}<ArUcoParamsControls
                  selectedArUco={selectedObject as ArUcoMarker}
                  {editRevision}
                  valueUpdated={onValueUpdated} />{/if}
              {#if selectedObject}<VectorParamsControls
                  {selectedObject}
                  {editRevision}
                  valueUpdated={onValueUpdated} />{/if}
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
        {:else if activeTab === "printer"}
          <div class="flex gap-2 mb-3">
            <button
              class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
              onclick={onPreview}>
              <MdIcon icon="visibility" />
              Preview
            </button>
            <button
              class="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onclick={onPrint}
              disabled={$connectionState !== "connected"}>
              <MdIcon icon="print" />
              Print
            </button>
          </div>
          <PrinterConnector />
        {:else if activeTab === "language"}
          <div class="flex flex-col gap-3">
            <div class="text-xs text-zinc-400">Select language</div>
            <select
              class="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded px-3 py-2 hover:border-zinc-500 transition-colors focus:outline-none focus:border-zinc-500"
              bind:value={$locale}>
              {#each Object.entries(locales) as [key, name] (key)}
                <option value={key}>{name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
