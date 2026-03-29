<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { detectAntiFingerprinting } from "$/utils/browsers";
  let caps = Utils.getAvailableTransports();

  let antiFingerprinting = detectAntiFingerprinting();
</script>

{#if !caps.webSerial && !caps.webBluetooth && !caps.capacitorBle}
  <div class="bg-red-900/30 border border-red-700 rounded px-4 py-3 text-red-400 text-sm" role="alert">
    <div>
      {$tr("browser_warning.lines.first")}
      <MdIcon icon="sentiment_very_dissatisfied" />
    </div>
    <div>
      {$tr("browser_warning.lines.second")}
    </div>
  </div>
{/if}

{#if antiFingerprinting}
  <div class="bg-red-900/30 border border-red-700 rounded px-4 py-3 text-red-400 text-sm" role="alert">
    {$tr("browser_warning.fingerprinting")}
  </div>
{/if}
