<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { detectAntiFingerprinting } from "$/utils/browsers";
  import AppModal from "$/components/basic/AppModal.svelte";

  interface Props {
    show?: boolean;
  }

  let { show = $bindable(false) }: Props = $props();

  let caps = Utils.getAvailableTransports();

  let antiFingerprinting = detectAntiFingerprinting();

  let hasWarning = $derived(!caps.webSerial && !caps.webBluetooth && !caps.capacitorBle);
  let hasFingerprinting = $derived(antiFingerprinting);
</script>

<AppModal bind:show title="Browser Warning">
  <div class="space-y-4">
    {#if hasWarning}
      <div class="bg-red-900/30 border border-red-700 rounded px-4 py-3 text-red-400" role="alert">
        <div class="flex items-center gap-2">
          <MdIcon icon="sentiment_very_dissatisfied" class="text-xl" />
          <span class="font-semibold">{$tr("browser_warning.lines.first")}</span>
        </div>
        <div class="mt-2">
          {$tr("browser_warning.lines.second")}
        </div>
      </div>
    {/if}

    {#if hasFingerprinting}
      <div class="bg-red-900/30 border border-red-700 rounded px-4 py-3 text-red-400" role="alert">
        <div class="flex items-center gap-2">
          <MdIcon icon="security" class="text-xl" />
          <span class="font-semibold">{$tr("browser_warning.fingerprinting")}</span>
        </div>
      </div>
    {/if}
  </div>
</AppModal>
