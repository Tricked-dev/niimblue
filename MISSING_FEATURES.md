# Missing Features Comparison

This document lists features from the old Online-TSPL_Designer that are missing in the current niimblue implementation, with detailed information about objects and their properties.

---

## Objects/Elements Comparison

### Current Implemented Objects

| Object       | Icon                     | Description                                            |
| ------------ | ------------------------ | ------------------------------------------------------ |
| Text         | `title`                  | Single-line and multi-line text with font selection    |
| Barcode      | `view_week`              | Supports CODE128, CODE39, EAN, UPC, etc. via JsBarcode |
| QR Code      | `qr_code_2`              | QR code generation with error correction levels        |
| ArUco Marker | `grid_on`                | ArUco markers for positioning                          |
| Rectangle    | `crop_square`            | Rectangles and squares (filled/outlined)               |
| Circle       | `radio_button_unchecked` | Circles and ellipses                                   |
| Line         | `remove`                 | Lines and diagonal lines                               |
| Image        | `image`                  | PNG, JPG, SVG image import                             |
| PDF          | `picture_as_pdf`         | PDF page import as image                               |

---

### Missing Objects (Detailed)

#### 1. Datamatrix

**Status:** Missing

**Purpose:** 2D barcode commonly used for inventory tracking, product labeling, healthcare.

**TSPL Command:** `DMATRIX`

**Settings in old project:**

- `width` - Width in dots/pixels
- `height` - Height in dots/pixels (auto-calculated from width for square)
- `cellWidth` - Module size (cell size in dots)
- `data` - The text/data to encode
- `evenSize` - Force even matrix dimensions
- `rotation` - 0, 90, 180, 270 degrees
- Validation to ensure cell size isn't too large for the data

**Implementation approach:**

- Uses `datamatrix-svg` library (https://github.com/datalog/datamatrix-svg)
- Renders as SVG element
- Auto-calculates required size based on data length

---

#### 2. TextBox (BLOCK)

**Status:** Partial - Current project has basic text, needs BLOCK functionality

**Purpose:** Multi-line text with automatic word wrapping, commonly used for addresses.

**TSPL Command:** `BLOCK`

**Settings in old project:**

- `width` - Block width in dots
- `height` - Block height in dots
- `font` - Font selection (ROMAN, OSANS-B, OSANS-R)
- `fontsize` - Font size
- `rotation` - 0, 90, 180, 270 degrees
- `data` - Text content with line breaks
- `alignment` - Left, center, right alignment
- `spacing` - Line spacing

**Difference from current Text:**

- BLOCK wraps text within bounds automatically
- Current `fabric.Textbox` does this but needs to map to TSPL BLOCK

---

#### 3. Reverse Box (REVERSE)

**Status:** Missing

**Purpose:** Filled rectangle with inverted (white on black) fill, used for high-contrast labels.

**TSPL Command:** `REVERSE`

**Settings:**

- `width` - Box width
- `height` - Box height
- `rotation` - 0, 90, 180, 270 degrees

**Implementation:** Same as BOX but with inverted fill (white bars on black background instead of black on white)

---

#### 4. Simple Bar (BAR)

**Status:** Missing

**Purpose:** Simple horizontal or vertical line bar, different from the diagonal LINE element.

**TSPL Command:** `BAR`

**Settings:**

- `width` - Bar width
- `height` - Bar height
- `rotation` - 0, 90, 180, 270 degrees

**Note:** This is different from the existing "Line" tool which creates diagonal lines. BAR creates horizontal/vertical filled rectangles.

---

### Object Settings Comparison

#### Text Settings

| Setting     | Old Project         | Current Project     | Notes             |
| ----------- | ------------------- | ------------------- | ----------------- |
| Font Family | System + User fonts | System + User fonts |                   |
| Font Size   | ✅                  | ✅                  |                   |
| Bold        | ✅                  | ✅ Toggle button    |                   |
| Italic      | ✅                  | ✅ Toggle button    |                   |
| Text Align  | ✅                  | ✅                  |                   |
| Rotation    | 0/90/180/270        | 0-360° free         | Current is better |
| Multi-line  | fabric.Textbox      | fabric.Textbox      |                   |

#### Barcode Settings

| Setting   | Old Project                | Current Project    | Notes                    |
| --------- | -------------------------- | ------------------ | ------------------------ |
| Format    | code128, code39, ean, etc. | ✅                 | Same library (JsBarcode) |
| Data      | ✅                         | ✅                 |                          |
| Show Text | ✅                         | ✅                 | Toggle human readable    |
| Height    | ✅                         | ✅                 | Bar height in dots       |
| Width     | Auto-calculated            | Cell width setting |                          |
| Rotation  | 0/90/180/270               | 0-360° free        | Current is better        |
| Checksum  | Auto/Manual                | Auto               |                          |

#### QR Code Settings

| Setting          | Old Project  | Current Project | Notes               |
| ---------------- | ------------ | --------------- | ------------------- |
| Model            | 1, 2         | 2               |                     |
| Error Correction | L, M, Q, H   | ✅              |                     |
| Size             | Auto         | Fixed size      | Old auto-calculates |
| Rotation         | 0/90/180/270 | 0-360° free     | Current is better   |

---

## Fonts

### Current Font System

The current project uses:

- **Default:** Noto Sans Variable (bundled)
- **System Fonts:** Loaded via `queryLocalFonts()` API
- **User Fonts:** Can load custom TTF/OTF files via FontsMenu

### Recommended Addition

**Status:** ✅ DONE - Added Open Sans fonts from old project

The Open Sans fonts have been added to the project:

- Fonts copied from old project: `OSans-R.ttf`, `OSans-B.ttf`
- Added to `public/fonts/` directory
- Automatically loaded at app startup via `stores.ts`
- Available in FontFamilyPicker

---

## Settings & Preferences

### Old Project Default Settings

```json
{
  "animations": true,
  "nonPrintableColor": "#FF00FF",
  "resizeSnap": 0.5,
  "moveSnap": 0.5,
  "maxScaling": 5,
  "minScaling": 0.2,
  "visualGrid": "off",
  "multiSelect": "shift",
  "minBorderHitbox": 0.6,
  "anchorSize": 0.5,
  "dotSizing": false,
  "snapLock": true,
  "autoSave": false
}
```

### Missing Settings Detail

| Setting                 | Purpose                              | Priority |
| ----------------------- | ------------------------------------ | -------- |
| **Move Snapping**       | Snap objects to grid when moving     | High     |
| **Resize Snapping**     | Snap object handles during resize    | High     |
| **Snap Lock**           | Lock move/resize snap to same value  | Medium   |
| **Visual Grid**         | Show/hide grid lines on canvas       | High     |
| **Non-printable Color** | Color for margins outside label area | Medium   |
| **Min/Max Scaling**     | Limit zoom range                     | Low      |
| **Multi-select Mode**   | Shift/ Ctrl/ Always                  | Medium   |
| **Anchor Size**         | Resize handle size                   | Low      |
| **Theme Selection**     | Dark/Light mode                      | Low      |
| **Factory Reset**       | Reset all settings                   | Low      |

---

## Keyboard Shortcuts

### Old Project Shortcuts

| Key              | Action                |
| ---------------- | --------------------- |
| Ctrl+C           | Copy                  |
| Ctrl+V           | Paste                 |
| Ctrl+X           | Cut                   |
| Delete           | Delete selected       |
| Ctrl+A           | Select all            |
| Escape           | Deselect              |
| Shift+Escape     | Deselect last         |
| Arrow keys       | Move selected         |
| Shift+Arrow      | Resize (Nudge)        |
| Ctrl+Arrow       | Move by larger step   |
| Ctrl+Shift+Arrow | Resize by larger step |
| Ctrl+Z           | Undo                  |
| Ctrl+Y           | Redo                  |
| Ctrl+.           | Label to screen (fit) |
| Ctrl+,           | Elements to screen    |
| Ctrl+P           | Print dialog          |
| Ctrl+U           | User settings         |
| 1-9              | Quick place elements  |

### Current Project

Only basic copy/paste/undo implemented. Missing most shortcuts.

---

## Label Presets

### Current Presets (4)

```typescript
// defaults.ts
export const DEFAULT_LABEL_PRESETS: LabelPreset[] = [
  // 203dpi
  { width: 40, height: 12, unit: "mm", dpmm: 8, printDirection: "left", shape: "rect" },
  { width: 50, height: 30, unit: "mm", dpmm: 8, printDirection: "top", shape: "rect" },
  // 300dpi
  { width: 40, height: 12, unit: "mm", dpmm: 11.81, printDirection: "left", shape: "rect", title: "40x12mm 300dpi" },
  { width: 50, height: 30, unit: "mm", dpmm: 11.81, printDirection: "top", shape: "rect", title: "50x30mm 300dpi" },
];
```

### Old Project Presets (Not applicable)

The old project had 100+ label presets for TTP/ATP printers - not applicable to NiimBlue printers.

### Recommended Priority Presets

High-volume labels to add:

1. 50x25mm (standard address label)
2. 50x30mm
3. 76x25mm
4. 76x50mm
5. 100x50mm
6. A4 sheets (for batch printing)

---

## Implementation Priority

### Phase 1: Essential Objects

1. **Datamatrix** - High demand barcode type
2. **TextBox (BLOCK)** - Multi-line text wrapping

### Phase 2: Editor Experience

3. **Snapping/Grid** - Precise positioning
4. **Keyboard Shortcuts** - Productivity
5. **Visual Grid** - Alignment help

### Phase 3: Polish

6. ~~**Open Sans Fonts**~~ - ✅ DONE
7. **More Label Presets** - Common sizes
8. **Reverse Box** - Special effect

### Phase 4: Nice to Have

9. Theme selection
10. Factory reset
11. Auto-save
