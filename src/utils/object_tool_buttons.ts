import type { OjectType } from "$/types";
import type { MaterialIcon } from "$/styles/mdi_icons";

export const toolButtons: { type: OjectType; icon: MaterialIcon; title: string }[] = [
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
