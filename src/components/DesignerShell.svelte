<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import type { CustomCanvas } from "$/fabric-object/custom_canvas";
  import type { LabelProps, OjectType, ExportedLabelTemplate } from "$/types";
  import type { UndoState } from "$/utils/undo_redo";
  import type { MaterialIcon } from "$/styles/mdi_icons";
  import * as fabric from "fabric";
  import { labelDpmm } from "$/stores";
  import DesignerTopBar from "$/components/DesignerTopBar.svelte";
  import DesignerRail from "$/components/DesignerRail.svelte";
  import DesignerPanel from "$/components/DesignerPanel.svelte";
  import DesignerLayers from "$/components/DesignerLayers.svelte";
  import CanvasRuler from "$/components/CanvasRuler.svelte";
  import ZoomControls from "$/components/ZoomControls.svelte";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  const RULER_SIZE = 18;

  interface Highlight {
    start: number;
    end: number;
  }

  interface Props {
    canvas: CustomCanvas | undefined;
    labelProps: LabelProps;
    selectedObject: fabric.FabricObject | undefined;
    selectedCount: number;
    editRevision: number;
    undoState: UndoState;
    csvEnabled?: boolean;
    children?: Snippet;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onPreview: () => void;
    onPrint: () => void;
    onSave: () => void;
    onOpen: () => void;
    onObjectPicked: (type: OjectType) => void;
    onIconPicked: (icon: MaterialIcon) => void;
    onSvgIconPicked: (svg: string) => void;
    onZplImageReady: (img: Blob) => void;
    onPdfImageReady: (el: HTMLCanvasElement) => void;
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    onCsvPlaceholderPicked: (name: string) => void;
    onLabelSettingsOpen: () => void;
    onValueUpdated: () => void;
    onLabelPropsChange: (props: LabelProps) => void;
    onDeleteSelected: () => void;
    onCloneSelected: () => void;
  }

  let {
    canvas,
    labelProps,
    selectedObject,
    selectedCount,
    editRevision,
    undoState,
    csvEnabled = $bindable(false),
    children,
    onUndo,
    onRedo,
    onClear,
    onPreview,
    onPrint,
    onSave,
    onOpen,
    onObjectPicked,
    onIconPicked,
    onSvgIconPicked,
    onZplImageReady,
    onPdfImageReady,
    onRequestLabelTemplate,
    onLoadRequested,
    onCsvPlaceholderPicked,
    onLabelSettingsOpen,
    onValueUpdated,
    onLabelPropsChange,
    onDeleteSelected,
    onCloneSelected,
  }: Props = $props();

  const CANVAS_PADDING = 3000;

  let scrollWrapper = $state<HTMLElement | undefined>();
  let zoom = $state(1);
  let moveRevision = $state(0);
  let scrollX = $state(0);
  let scrollY = $state(0);
  let areaWidth = $state(600);
  let areaHeight = $state(400);
  let isMobile = $state(false);

  // Layers overlay
  let layersOpen = $state(false);

  // Label settings panel (opened by settings button or right-click)
  let labelSettingsOpen = $state(false);
  let labelSettingsPos = $state<{ x: number; y: number } | null>(null);

  // Selection highlight for rulers
  let hlH = $state<Highlight | undefined>();
  let hlV = $state<Highlight | undefined>();

  $effect(() => {
    if (!canvas || !scrollWrapper) return;
    canvas.setScrollWrapper(scrollWrapper, CANVAS_PADDING);
    requestAnimationFrame(() => canvas?.fitToWrapper());
  });

  $effect(() => {
    if (!canvas) return;
    const update = () => {
      moveRevision++;
    };
    canvas.on("object:moving" as any, update);
    canvas.on("object:scaling" as any, update);
    canvas.on("object:rotating" as any, update);
    return () => {
      canvas.off("object:moving" as any, update);
      canvas.off("object:scaling" as any, update);
      canvas.off("object:rotating" as any, update);
    };
  });

  $effect(() => {
    if (!canvas) return;
    const handler = (e: any) => {
      zoom = e.zoom;
    };
    canvas.on("viewport:changed" as any, handler);
    return () => {
      canvas.off("viewport:changed" as any, handler);
    };
  });

  // Compute ruler selection highlight
  $effect(() => {
    void editRevision;
    void moveRevision;
    void zoom;
    void scrollX;
    void scrollY;

    if (!selectedObject || !canvas || !scrollWrapper) {
      hlH = undefined;
      hlV = undefined;
      return;
    }

    const canvasEl = canvas.getElement();
    const wrapperRect = scrollWrapper.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const canvasOffsetX = canvasRect.left - wrapperRect.left;
    const canvasOffsetY = canvasRect.top - wrapperRect.top;

    const br = selectedObject.getBoundingRect();

    hlH = {
      start: canvasOffsetX + br.left * zoom,
      end: canvasOffsetX + (br.left + br.width) * zoom,
    };
    hlV = {
      start: canvasOffsetY + br.top * zoom,
      end: canvasOffsetY + (br.top + br.height) * zoom,
    };
  });

  const handleScroll = () => {
    if (scrollWrapper) {
      scrollX = scrollWrapper.scrollLeft;
      scrollY = scrollWrapper.scrollTop;
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    labelSettingsPos = { x: e.clientX, y: e.clientY };
    labelSettingsOpen = true;
  };

  const closeLabelSettings = () => {
    labelSettingsOpen = false;
    labelSettingsPos = null;
  };

  // Settings button in rail opens label settings
  const openLabelSettings = () => {
    if (!isMobile && canvas && canvas.getActiveObject()) return;
    labelSettingsOpen = true;
    labelSettingsPos = null; // centered modal mode
    onLabelSettingsOpen();
  };

  onMount(() => {
    isMobile = window.innerWidth < 640;
    const ro = new ResizeObserver(() => {
      if (scrollWrapper) {
        areaWidth = scrollWrapper.clientWidth;
        areaHeight = scrollWrapper.clientHeight;
      }
      isMobile = window.innerWidth < 640;
    });
    if (scrollWrapper) {
      ro.observe(scrollWrapper);
      areaWidth = scrollWrapper.clientWidth;
      areaHeight = scrollWrapper.clientHeight;
    }
    return () => ro.disconnect();
  });
</script>

<!-- Close label settings on outside click -->
<svelte:window
  onclick={() => {
    if (labelSettingsOpen) closeLabelSettings();
  }} />

<div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
  <DesignerTopBar {undoState} {onUndo} {onRedo} {onClear} {onPreview} {onPrint} {onSave} {onOpen} />

  <div class="flex flex-1 overflow-hidden min-h-0">
    <!-- Left tool rail (desktop only) -->
    {#if !isMobile}
      <DesignerRail
        {labelProps}
        {canvas}
        bind:csvEnabled
        {onObjectPicked}
        {onIconPicked}
        {onSvgIconPicked}
        {onZplImageReady}
        {onPdfImageReady}
        {onRequestLabelTemplate}
        {onLoadRequested}
        {onCsvPlaceholderPicked}
        onLabelSettingsOpen={openLabelSettings} />
    {/if}

    <!-- Canvas area -->
    <div class="flex flex-col flex-1 overflow-hidden relative min-w-0">
      <!-- Ruler row: corner + horizontal ruler -->
      <div class="flex shrink-0">
        <div
          style="width:{RULER_SIZE}px;height:{RULER_SIZE}px"
          class="bg-[#1e1e2e] border-b border-r border-[#313244] shrink-0">
        </div>
        <CanvasRuler
          {zoom}
          scrollOffset={scrollX}
          dpmm={$labelDpmm}
          length={areaWidth}
          axis="horizontal"
          highlight={hlH} />
      </div>

      <!-- Vertical ruler + scrollable canvas -->
      <div class="flex flex-1 overflow-hidden min-h-0">
        <CanvasRuler
          {zoom}
          scrollOffset={scrollY}
          dpmm={$labelDpmm}
          length={areaHeight}
          axis="vertical"
          highlight={hlV} />

        <!-- Scroll wrapper -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          bind:this={scrollWrapper}
          class="flex-1 overflow-auto bg-zinc-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          onscroll={handleScroll}
          oncontextmenu={handleContextMenu}
          ondblclick={openLabelSettings}>
          <div
            class="flex items-center justify-center"
            style="min-width:100%;min-height:100%;padding:{CANVAS_PADDING}px;">
            {@render children?.()}
          </div>
        </div>
      </div>

      <!-- Bottom-left overlay: Layers panel + Zoom controls -->
      <div class="absolute bottom-3 z-10" style="left:{RULER_SIZE + 8}px">
        <!-- Layers panel (grows upward from toggle button) -->
        <div class="relative mb-1">
          {#if layersOpen}
            <div
              class="absolute bottom-full mb-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
              style="width:200px; max-height:40vh;"
              onclick={(e) => e.stopPropagation()}
              role="presentation">
              <div
                class="px-3 py-1.5 border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Layers
              </div>
              <div class="overflow-y-auto" style="max-height:calc(40vh - 32px)">
                <DesignerLayers {canvas} revision={editRevision} onSelectionChange={() => { if (isMobile) layersOpen = false; }} />
              </div>
            </div>
          {/if}
          <button
            class="flex items-center gap-1 px-2 h-7 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs transition-colors"
            onclick={(e) => {
              e.stopPropagation();
              layersOpen = !layersOpen;
            }}>
            <MdIcon icon="layers" />
            <span class="text-[10px]">Layers</span>
            <MdIcon icon={layersOpen ? "expand_more" : "expand_less"} />
          </button>
        </div>

        <ZoomControls {canvas} {zoom} />
      </div>
    </div>

    <!-- Right properties panel (desktop only) -->
    {#if !isMobile}
      <DesignerPanel
        {canvas}
        {selectedObject}
        {selectedCount}
        {editRevision}
        {onValueUpdated}
        {onDeleteSelected}
        {onCloneSelected} />
    {/if}
  </div>

  <!-- Mobile bottom sheet -->
  {#if isMobile}
    <DesignerPanel
      {canvas}
      {selectedObject}
      {selectedCount}
      {editRevision}
      {onValueUpdated}
      {onDeleteSelected}
      {onCloneSelected}
      {onObjectPicked}
      {onPreview}
      {onPrint}
      onLabelSettingsOpen={openLabelSettings}
      sheet={true} />
  {/if}
</div>

<!-- Label settings floating panel (right-click or settings button) -->
{#if labelSettingsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center" onclick={closeLabelSettings}>
    <div
      class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col max-sm:h-[80vh] max-sm:w-[95vw] max-sm:max-w-[95vw]"
      style="max-height:90vh; width:min(95vw,480px); {labelSettingsPos
        ? `position:fixed;left:${Math.min(labelSettingsPos.x, window.innerWidth - 500)}px;top:${Math.min(labelSettingsPos.y, window.innerHeight - 400)}px;`
        : ''}"
      onclick={(e) => e.stopPropagation()}
      role="presentation">
      <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <span class="text-sm font-semibold text-zinc-200">Label Settings</span>
        <button
          class="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          onclick={closeLabelSettings}>
          <MdIcon icon="close" />
        </button>
      </div>
      <div class="overflow-y-auto py-3">
        <LabelPropsEditor
          {labelProps}
          onChange={(p) => {
            onLabelPropsChange(p);
            closeLabelSettings();
          }} />
      </div>
    </div>
  </div>
{/if}
