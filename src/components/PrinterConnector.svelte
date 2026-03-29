<script lang="ts">
  import { NiimbotCapacitorBleClient, SoundSettingsItemType, Utils, type AvailableTransports } from "@mmote/niimbluelib";
  import {
    printerClient,
    connectedPrinterName,
    connectionState,
    initClient,
    heartbeatData,
    printerInfo,
    printerMeta,
    heartbeatFails,
    automation,
    rfidInfo,
    ribbonRfidInfo,
    refreshRfidInfo,
  } from "$/stores";
  import type { ConnectionType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { onMount } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { MaterialIcon } from "material-icons";
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";

  let settingsOpen = $state(false);
  let printerInfoOpen = $state(false);
  let modelMetaOpen = $state(false);
  let rfidInfoOpen = $state(false);
  let ribbonRfidInfoOpen = $state(false);
  let heartbeatDataOpen = $state(false);
  let testsOpen = $state(false);

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  const onConnectClicked = async () => {
    initClient(connectionType);
    connectionState.set("connecting");

    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const onDisconnectClicked = () => {
    $printerClient.disconnect();
  };

  const startHeartbeat = async () => {
    $printerClient.startHeartbeat();
  };

  const stopHeartbeat = async () => {
    $printerClient.stopHeartbeat();
  };

  const soundOn = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, true);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, true);
  };

  const soundOff = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, false);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, false);
  };

  const fetchInfo = async () => {
    await $printerClient.fetchPrinterInfo();
  };

  const reset = async () => {
    await $printerClient.abstraction.printerReset();
  };

  const switchConnectionType = (c: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(c);
    connectionType = c;
  };

  const batteryIcon = (value: number): MaterialIcon => {
    if (value > 4) {
      value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    }

    if (value === 4) {
      return "battery_full";
    } else if (value === 3) {
      return "battery_5_bar";
    } else if (value === 2) {
      return "battery_3_bar";
    } else if (value === 1) {
      return "battery_2_bar";
    }
    return "battery_0_bar";
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();

    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";

    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webSerial && connectionType === "serial") {
      connectionType = "bluetooth";
    }
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) {
      connectionType = "capacitor-ble";
    }

    if ($automation !== undefined && $automation.autoConnect && connectionType === "capacitor-ble") {
      onConnectClicked();
    }
  });
</script>

<svelte:window onclick={() => settingsOpen = false} />

<div class="flex items-stretch flex-nowrap justify-end w-auto">
  {#if $connectionState === "connected"}
    <div class="relative" onclick={(e) => e.stopPropagation()}>
      <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => settingsOpen = !settingsOpen}>
        <MdIcon icon="settings" />
      </button>
      {#if settingsOpen}
      <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-1 text-xs text-zinc-300 right-0" style="width: 100vw; max-width: 300px;">
        {#if $printerInfo}
          <button class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded" onclick={() => printerInfoOpen = !printerInfoOpen}>
            Printer info <MdIcon icon={printerInfoOpen ? 'expand_less' : 'expand_more'} />
          </button>
          {#if printerInfoOpen}
          <ul class="px-3 pb-2 text-zinc-400">
            {#each Object.entries($printerInfo) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
          {/if}
        {/if}

        {#if $printerMeta}
          <button
            class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded mt-1"
            type="button"
            onclick={() => modelMetaOpen = !modelMetaOpen}>
            Model metadata <MdIcon icon={modelMetaOpen ? 'expand_less' : 'expand_more'} />
          </button>

          {#if modelMetaOpen}
          <ul class="px-3 pb-2 text-zinc-400">
            {#each Object.entries($printerMeta) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
          {/if}
        {/if}

        {#if $rfidInfo}
          <button
            class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded mt-1"
            type="button"
            onclick={() => rfidInfoOpen = !rfidInfoOpen}>
            RFID info <MdIcon icon={rfidInfoOpen ? 'expand_less' : 'expand_more'} />
          </button>

          {#if rfidInfoOpen}
          <div class="px-3 pb-2">
            <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors mt-1" onclick={refreshRfidInfo}>Update</button>
            <ul class="text-zinc-400">
              {#each Object.entries($rfidInfo) as [key, value] (key)}
                <li>{key}: <strong>{value ?? "-"}</strong></li>
              {/each}
            </ul>
          </div>
          {/if}
        {/if}

        {#if $ribbonRfidInfo}
          <button
            class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded mt-1"
            type="button"
            onclick={() => ribbonRfidInfoOpen = !ribbonRfidInfoOpen}>
            Ribbon RFID info <MdIcon icon={ribbonRfidInfoOpen ? 'expand_less' : 'expand_more'} />
          </button>

          {#if ribbonRfidInfoOpen}
          <div class="px-3 pb-2">
            <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors mt-1" onclick={refreshRfidInfo}>Update</button>
            <ul class="text-zinc-400">
              {#each Object.entries($ribbonRfidInfo) as [key, value] (key)}
                <li>{key}: <strong>{value ?? "-"}</strong></li>
              {/each}
            </ul>
          </div>
          {/if}
        {/if}

        {#if $heartbeatData}
          <button
            class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded mt-1"
            type="button"
            onclick={() => heartbeatDataOpen = !heartbeatDataOpen}>
            Heartbeat data <MdIcon icon={heartbeatDataOpen ? 'expand_less' : 'expand_more'} />
          </button>

          {#if heartbeatDataOpen}
          <ul class="px-3 pb-2 text-zinc-400">
            {#each Object.entries($heartbeatData) as [key, value] (key)}
              <li>{key}: <strong>{value ?? "-"}</strong></li>
            {/each}
          </ul>
          {/if}
        {/if}

        <FirmwareUpdater />

        <button
          class="block w-full px-3 py-1.5 text-left hover:bg-zinc-700 rounded mt-1"
          type="button"
          onclick={() => testsOpen = !testsOpen}>
          Tests <MdIcon icon={testsOpen ? 'expand_less' : 'expand_more'} />
        </button>

        {#if testsOpen}
        <div class="flex flex-wrap gap-1 mt-1 px-2 pb-2">
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={startHeartbeat}>Heartbeat on</button>
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={stopHeartbeat}>Heartbeat off</button>
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={soundOn}>Sound on</button>
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={soundOff}>Sound off</button>
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={fetchInfo}>Fetch info again</button>
          <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={reset}>Reset</button>
        </div>
        {/if}
      </div>
      {/if}
    </div>
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0">
      {#if connectionType === "serial"}
        <MdIcon icon="usb" />
      {:else}
        <MdIcon icon="bluetooth" />
      {/if}
    </span>
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-[11px] shrink-0 {$heartbeatFails > 0 ? 'text-yellow-400' : 'text-zinc-500'}">
      {$printerMeta?.model ?? $connectedPrinterName}
    </span>
    {#if $heartbeatData?.chargeLevel}
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0">
        <MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90"></MdIcon>
      </span>
    {/if}
  {:else}
    {#if featureSupport.webBluetooth}
      <button
        disabled={$connectionState === "connecting"}
        class="inline-flex items-center gap-1 px-2 h-7 border border-zinc-700 text-xs transition-colors whitespace-nowrap {connectionType === 'bluetooth' ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
        onclick={() => switchConnectionType("bluetooth")}>
        <MdIcon icon="bluetooth" />
        {$tr("connector.bluetooth")}
      </button>
    {/if}
    {#if featureSupport.webSerial}
      <button
        disabled={$connectionState === "connecting"}
        class="inline-flex items-center gap-1 px-2 h-7 border border-l-0 border-zinc-700 text-xs transition-colors whitespace-nowrap {connectionType === 'serial' ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
        onclick={() => switchConnectionType((connectionType = "serial"))}>
        <MdIcon icon="usb" />
        {$tr("connector.serial")}
      </button>
    {/if}
    {#if featureSupport.capacitorBle}
      <button
        disabled={$connectionState === "connecting"}
        class="inline-flex items-center gap-1 px-2 h-7 border border-l-0 border-zinc-700 text-xs transition-colors whitespace-nowrap {connectionType === 'capacitor-ble' ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
        onclick={() => switchConnectionType((connectionType = "capacitor-ble"))}>
        <MdIcon icon="usb" />
        Capacitor BLE
      </button>
    {/if}
  {/if}

  {#if $connectionState !== "connected"}
    <button
      class="inline-flex items-center gap-1 px-2.5 h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors border border-blue-600 rounded-r"
      disabled={$connectionState === "connecting" ||
        (!featureSupport.capacitorBle && !featureSupport.webBluetooth && !featureSupport.webSerial)}
      onclick={onConnectClicked}>
      <MdIcon icon="power" />
    </button>
  {/if}

  {#if $connectionState === "connected"}
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r bg-red-700 hover:bg-red-600 text-white text-xs transition-colors" onclick={onDisconnectClicked}>
      <MdIcon icon="power_off" />
    </button>
  {/if}
</div>
