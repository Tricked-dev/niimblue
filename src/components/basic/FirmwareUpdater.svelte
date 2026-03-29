<script lang="ts">
  import type { FirmwareProgressEvent } from "@mmote/niimbluelib";
  import { printerClient } from "$/stores";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";

  let fwVersion = $state<string>("");
  let fwVersionValid: boolean = $derived(/^\d+\.\d+$/.test(fwVersion));
  let fwProgress = $state<string>("");
  let fwData = $state<Uint8Array>();
  let fwName = $state<string>("");

  const browseFw = async () => {
    const file = await FileUtils.pickAndReadBinaryFile("bin");
    fwData = new Uint8Array(file.data);
    fwName = file.name;

    const match = fwName.match(/(\d+\.\d+)/);

    // For modern firmware images version is stored in header
    if (fwData.length >= 0x1C && fwData[0] === 0x18) {
      const verNumber = (fwData[0x15] << 8) + fwData[0x14];
      fwVersion = (verNumber / 100).toFixed(2);
    } else if (match) {
      fwVersion = match[1];
    } else {
      fwVersion = "";
    }
  };

  const upgradeFw = async () => {
    if (fwData === undefined) {
      return;
    }

    if (!confirm("Flashing wrong firmware can make your printer dead. Are you sure?")) {
      return;
    }

    const listener = (e: FirmwareProgressEvent) => {
      fwProgress = `${e.currentChunk}/${e.totalChunks}`;
    };

    $printerClient.stopHeartbeat();

    try {
      $printerClient.on("firmwareprogress", listener);
      fwProgress = "...";
      await $printerClient.abstraction.firmwareUpgrade(fwData, fwVersion);
      $printerClient.off("firmwareprogress", listener);
      await $printerClient.disconnect();

      Toasts.message("Flashing is finished, the printer will shut down now");

      fwData = undefined;
      fwName = "";
      fwVersion = "";
    } catch (e) {
      $printerClient.startHeartbeat();
      $printerClient.off("firmwareprogress", listener);
      Toasts.error(e);
    }

    fwProgress = "";
  };
</script>

<div class="flex flex-col gap-1">
  <span class="text-xs text-zinc-400">Firmware flashing</span>
  <div class="flex items-stretch mt-1">
    {#if fwProgress}
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-500 text-[11px]">Uploading {fwProgress}</span>
    {:else}
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 rounded-l text-zinc-500 text-[11px] shrink-0">To</span>
      <button
        class="inline-flex items-center px-2 h-7 bg-zinc-800 hover:bg-zinc-700 border-y border-zinc-700 text-zinc-300 text-xs transition-colors truncate max-w-[80px]"
        title={fwName}
        onclick={browseFw}
        disabled={!!fwProgress}
      >{fwName.length > 0 ? fwName.slice(0, 8) + "..." : "Browse..."}</button>
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0">ver.</span>
      <input
        class="w-14 bg-zinc-800 border border-zinc-700 px-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
        placeholder="x.x"
        type="text"
        bind:value={fwVersion}
      />
      <button
        class="inline-flex items-center px-2 h-7 rounded-r bg-red-700 hover:bg-red-600 text-white text-xs transition-colors disabled:opacity-40"
        onclick={upgradeFw}
        disabled={!!fwProgress || !fwVersionValid || fwData === undefined}
      >Burn</button>
    {/if}
  </div>
</div>
