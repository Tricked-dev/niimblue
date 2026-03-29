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
  import CanvasRuler from "$/components/CanvasRuler.svelte";
  import ZoomControls from "$/components/ZoomControls.svelte";

  const RULER_SIZE = 18;

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

  let scrollWrapper = $state<HTMLElement | undefined>();
  let zoom = $state(1);
  let scrollX = $state(0);
  let scrollY = $state(0);
  let areaWidth = $state(600);
  let areaHeight = $state(400);
  let isMobile = $state(false);

  $effect(() => {
    if (!canvas || !scrollWrapper) return;
    canvas.setScrollWrapper(scrollWrapper);
    // Fit label to viewport on initial setup
    requestAnimationFrame(() => canvas.fitToWrapper());
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

  const handleScroll = () => {
    if (scrollWrapper) {
      scrollX = scrollWrapper.scrollLeft;
      scrollY = scrollWrapper.scrollTop;
    }
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

<div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
  <DesignerTopBar
    {undoState}
    {onUndo}
    {onRedo}
    {onClear}
    {onPreview}
    {onPrint}
    {onSave}
    {onOpen}
  />

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
        {onLabelSettingsOpen}
      />
    {/if}

    <!-- Canvas area -->
    <div class="flex flex-col flex-1 overflow-hidden relative min-w-0">
      <!-- Ruler row: corner + horizontal ruler -->
      <div class="flex shrink-0">
        <div
          style="width:{RULER_SIZE}px;height:{RULER_SIZE}px"
          class="bg-[#1e1e2e] border-b border-r border-[#313244] shrink-0"
        ></div>
        <CanvasRuler
          {zoom}
          scrollOffset={scrollX}
          dpmm={$labelDpmm}
          length={areaWidth}
          axis="horizontal"
        />
      </div>

      <!-- Vertical ruler + scrollable canvas -->
      <div class="flex flex-1 overflow-hidden min-h-0">
        <CanvasRuler
          {zoom}
          scrollOffset={scrollY}
          dpmm={$labelDpmm}
          length={areaHeight}
          axis="vertical"
        />

        <!-- Scroll wrapper — overflow:auto enables pan by scrolling -->
        <div
          bind:this={scrollWrapper}
          class="flex-1 overflow-auto bg-zinc-900"
          onscroll={handleScroll}
        >
          <!-- Inner container centers canvas; padding ensures space to scroll-pan -->
          <div class="flex items-center justify-center" style="min-width:100%;min-height:100%;padding:48px;">
            {@render children?.()}
          </div>
        </div>
      </div>

      <!-- Zoom controls — bottom-left overlay above vertical ruler -->
      <div class="absolute bottom-3 z-10" style="left:{RULER_SIZE + 8}px">
        <ZoomControls {canvas} {zoom} />
      </div>
    </div>

    <!-- Right properties panel (desktop only) -->
    {#if !isMobile}
      <DesignerPanel
        {selectedObject}
        {selectedCount}
        {editRevision}
        {labelProps}
        {onValueUpdated}
        {onLabelPropsChange}
        {onDeleteSelected}
        {onCloneSelected}
      />
    {/if}
  </div>

  <!-- Mobile bottom sheet -->
  {#if isMobile}
    <DesignerPanel
      {selectedObject}
      {selectedCount}
      {editRevision}
      {labelProps}
      {onValueUpdated}
      {onLabelPropsChange}
      {onDeleteSelected}
      {onCloneSelected}
      sheet={true}
    />
  {/if}
</div>
