<script lang="ts">
  import type { OjectType, LabelProps, ExportedLabelTemplate } from "$/types";
  import type { MaterialIcon } from "$/styles/mdi_icons";
  import type * as fabric from "fabric";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";

  interface Props {
    labelProps: LabelProps;
    canvas: fabric.Canvas | undefined;
    csvEnabled: boolean;
    onObjectPicked: (type: OjectType) => void;
    onIconPicked: (icon: MaterialIcon) => void;
    onSvgIconPicked: (svg: string) => void;
    onZplImageReady: (img: Blob) => void;
    onPdfImageReady: (el: HTMLCanvasElement) => void;
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    onCsvPlaceholderPicked: (name: string) => void;
    onLabelSettingsOpen: () => void;
  }

  let {
    labelProps,
    canvas,
    csvEnabled = $bindable(false),
    onObjectPicked,
    onIconPicked,
    onSvgIconPicked,
    onZplImageReady,
    onPdfImageReady,
    onRequestLabelTemplate,
    onLoadRequested,
    onCsvPlaceholderPicked,
    onLabelSettingsOpen,
  }: Props = $props();

  const btnClass =
    "w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors";

  const toolButtons: { type: OjectType; icon: MaterialIcon; title: string }[] = [
    { type: "text", icon: "title", title: "Text" },
    { type: "barcode", icon: "view_week", title: "Barcode" },
    { type: "qrcode", icon: "qr_code_2", title: "QR Code" },
    { type: "datamatrix", icon: "grid_3x3", title: "Datamatrix" },
    { type: "aruco", icon: "grid_on", title: "ArUco Marker" },
    { type: "rectangle", icon: "crop_square", title: "Rectangle" },
    { type: "reverseBox", icon: "invert_colors", title: "Reverse Box" },
    { type: "bar", icon: "horizontal_rule", title: "Simple Bar" },
    { type: "circle", icon: "radio_button_unchecked", title: "Circle" },
    { type: "line", icon: "remove", title: "Line" },
    { type: "image", icon: "image", title: "Image" },
  ];
</script>

<aside class="flex flex-col items-center w-[42px] bg-zinc-950 border-r border-zinc-800 py-1.5 gap-0.5 shrink-0">
  {#each toolButtons as { type, icon, title } (type)}
    <button class={btnClass} {title} onclick={() => onObjectPicked(type)}>
      <MdIcon {icon} />
    </button>
  {/each}

  <IconPicker onSubmit={onIconPicked} onSubmitSvg={onSvgIconPicked} />
  <ZplImportButton {labelProps} onImageReady={onZplImageReady} />
  <PdfImportButton {labelProps} onImageReady={onPdfImageReady} />

  <div class="flex-1"></div>

  <div class="w-6 h-px bg-zinc-800 my-0.5"></div>

  <CsvControl bind:enabled={csvEnabled} onPlaceholderPicked={onCsvPlaceholderPicked} />

  {#if canvas}
    <SavedLabelsMenu {canvas} {onRequestLabelTemplate} {onLoadRequested} {csvEnabled} />
  {/if}

  <button class={btnClass} title="Label settings" onclick={onLabelSettingsOpen}>
    <MdIcon icon="settings" />
  </button>
</aside>
