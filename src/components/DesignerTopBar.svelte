<script lang="ts">
  import type { UndoState } from "$/utils/undo_redo";
  import { connectionState, connectedPrinterName } from "$/stores";
  import { tr, locale, locales } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Utils } from "@mmote/niimbluelib";
  import { detectAntiFingerprinting } from "$/utils/browsers";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import { Toasts } from "$/utils/toasts";

  interface Props {
    undoState: UndoState;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onPreview: () => void;
    onPrint: () => void;
    onSave: () => void;
    onOpen: () => void;
  }

  let { undoState, onUndo, onRedo, onClear, onPreview, onPrint, onSave, onOpen }: Props = $props();

  let isMobile = $state(false);
  let showBrowserWarning = $state(false);

  const btn =
    "inline-flex items-center gap-1 px-2 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary =
    "inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed";

  import { onMount } from "svelte";

  let caps = Utils.getAvailableTransports();
  let antiFingerprinting = detectAntiFingerprinting();
  let hasAnyWarning = $derived((!caps.webSerial && !caps.webBluetooth && !caps.capacitorBle) || antiFingerprinting);

  onMount(() => {
    isMobile = window.innerWidth < 640;
    const ro = new ResizeObserver(() => {
      isMobile = window.innerWidth < 640;
    });
    window.addEventListener("resize", () => {
      isMobile = window.innerWidth < 640;
    });
    return () => ro.disconnect();
  });
</script>

<BrowserWarning bind:show={showBrowserWarning} />

<header class="flex items-center gap-1 px-3 bg-zinc-900 border-b border-zinc-800 shrink-0 z-20 h-[calc(2.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))]">
  <!-- Logo -->
  <span class="font-bold text-[15px] mr-2 select-none">
    <span class="text-red-400">Niim</span><span class="text-blue-400">Blue</span>
  </span>

  <!-- Browser warning indicator -->
  {#if hasAnyWarning}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="relative"
      title="Browser compatibility warning - click for details"
      onclick={() => (showBrowserWarning = true)}>
      <span
        class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold cursor-pointer animate-pulse">
        !
      </span>
    </div>
  {/if}

  <!-- Language selector (mobile: next to printer area will be handled in mobile bottom sheet) -->

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Save -->
  <button class={btn} title={$tr("editor.save")} onclick={onSave}>
    <MdIcon icon="save" />
  </button>

  <!-- Open -->
  <button class={btn} title={$tr("editor.open")} onclick={onOpen}>
    <MdIcon icon="folder_open" />
  </button>

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Undo -->
  <button class={btn} title={$tr("editor.undo")} onclick={onUndo} disabled={undoState.undoDisabled}>
    <MdIcon icon="undo" />
  </button>

  <!-- Redo -->
  <button class={btn} title={$tr("editor.redo")} onclick={onRedo} disabled={undoState.redoDisabled}>
    <MdIcon icon="redo" />
  </button>

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Clear -->
  <button class={btn} title={$tr("editor.clear")} onclick={onClear}>
    <MdIcon icon="cancel_presentation" />
  </button>

  <!-- Spacer -->
  <div class="flex-1"></div>

  <!-- Desktop: Language selector before printer badge -->
  {#if !isMobile}
    <select
      class="bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] rounded px-1.5 h-6 hover:border-zinc-500 transition-colors focus:outline-none"
      bind:value={$locale}
      title="Language">
      {#each Object.entries(locales) as [key, name] (key)}
        <option value={key}>{name}</option>
      {/each}
    </select>
    <div class="w-px h-5 bg-zinc-700 mx-1"></div>
  {/if}

  <!-- Printer badge -->
  {#if isMobile}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    {#if $connectionState === "connected"}
      <span
        class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-900 border border-green-700 text-green-400 text-sm cursor-pointer"
        title={$connectedPrinterName || "Connected"}
        onclick={() => Toasts.message(`Connected to ${$connectedPrinterName || "printer"}`)}>
        ✓
      </span>
    {:else if $connectionState === "connecting"}
      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px]">○</span>
    {:else}
      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px]">○</span>
    {/if}
  {:else}
    {#if $connectionState === "connected"}
      <span class="text-[10px] px-2 py-0.5 bg-green-900 text-green-300 rounded-full border border-green-700 font-medium">
        ● {$connectedPrinterName || "Connected"}
      </span>
    {:else if $connectionState === "connecting"}
      <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
        ○ Connecting…
      </span>
    {:else}
      <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
        ○ Not connected
      </span>
    {/if}

    <!-- Divider -->
    <div class="w-px h-5 bg-zinc-700 mx-1"></div>

    <!-- Preview -->
    <button class={btn} title={$tr("editor.preview")} onclick={onPreview}>
      <MdIcon icon="visibility" />
      Preview
    </button>

    <!-- Print -->
    <button class={btnPrimary} title={$tr("editor.print")} onclick={onPrint} disabled={$connectionState !== "connected"}>
      <MdIcon icon="print" />
      Print
    </button>
  {/if}
</header>
