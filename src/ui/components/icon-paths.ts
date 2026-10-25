/**
 * Los trazos de los íconos del kit, en una grilla de 24 × 24 y trazo de 2.
 *
 * Son los de Lucide (licencia ISC, https://lucide.dev), copiados a mano y
 * sin la dependencia: el kit usa una treintena y no hace falta cargar mil
 * quinientos. Las líneas y polilíneas de Lucide se reescribieron como `path`
 * para que el componente pinte solo tres primitivas: trazo, círculo y
 * rectángulo.
 *
 * Los nombres describen el dibujo, no el uso ("building", no "edificios"):
 * el kit no sabe de qué trata cada proyecto.
 *
 * Archivo puro: sin React Native, para poder probarlo con `node --test`.
 */

export type IconShape =
  | { d: string }
  | { circle: [cx: number, cy: number, r: number] }
  | { rect: [x: number, y: number, width: number, height: number, rx: number] };

export const ICONS = {
  home: [
    { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" },
    { d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  ],
  building: [
    { rect: [4, 2, 16, 20, 2] },
    { d: "M9 22v-4h6v4" },
    { d: "M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" },
  ],
  door: [
    { d: "M13 4h3a2 2 0 0 1 2 2v14" },
    { d: "M2 20h3M13 20h9M10 12v.01" },
    { d: "M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" },
  ],
  users: [
    { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { circle: [9, 7, 4] },
    { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  ],
  user: [{ d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }, { circle: [12, 7, 4] }],
  landmark: [{ d: "M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z" }],
  "calendar-check": [
    { d: "M8 2v4M16 2v4" },
    { rect: [3, 4, 18, 18, 2] },
    { d: "M3 10h18" },
    { d: "m9 16 2 2 4-4" },
  ],
  receipt: [
    { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" },
    { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" },
  ],
  gauge: [{ d: "m12 14 4-4" }, { d: "M3.34 19a10 10 0 1 1 17.32 0" }],
  calculator: [
    { rect: [4, 2, 16, 20, 2] },
    { d: "M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" },
  ],
  send: [
    { d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" },
    { d: "m21.854 2.147-10.94 10.939" },
  ],
  "file-text": [
    { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" },
    { d: "M14 2v4a2 2 0 0 0 2 2h4" },
    { d: "M10 9H8M16 13H8M16 17H8" },
  ],
  download: [{ d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }, { d: "M7 10l5 5 5-5M12 15V3" }],
  camera: [
    { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" },
    { circle: [12, 13, 3] },
  ],
  image: [{ rect: [3, 3, 18, 18, 2] }, { circle: [9, 9, 2] }, { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }],
  droplet: [{ d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" }],
  wallet: [
    { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" },
    { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" },
  ],
  percent: [{ d: "M19 5 5 19" }, { circle: [6.5, 6.5, 2.5] }, { circle: [17.5, 17.5, 2.5] }],
  plus: [{ d: "M5 12h14M12 5v14" }],
  pencil: [
    { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" },
    { d: "m15 5 4 4" },
  ],
  check: [{ d: "M20 6 9 17l-5-5" }],
  "check-circle": [{ circle: [12, 12, 10] }, { d: "m9 12 2 2 4-4" }],
  x: [{ d: "M18 6 6 18M6 6l12 12" }],
  "alert-triangle": [
    { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" },
    { d: "M12 9v4M12 17h.01" },
  ],
  "alert-circle": [{ circle: [12, 12, 10] }, { d: "M12 8v4M12 16h.01" }],
  info: [{ circle: [12, 12, 10] }, { d: "M12 16v-4M12 8h.01" }],
  lock: [{ rect: [3, 11, 18, 11, 2] }, { d: "M7 11V7a5 5 0 0 1 10 0v4" }],
  mail: [{ rect: [2, 4, 20, 16, 2] }, { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  "log-out": [{ d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }, { d: "M16 17l5-5-5-5M21 12H9" }],
  "refresh-cw": [
    { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" },
    { d: "M21 3v5h-5" },
    { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" },
    { d: "M8 16H3v5" },
  ],
  inbox: [
    { d: "M22 12h-6l-2 3h-4l-2-3H2" },
    { d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" },
  ],
  eye: [
    { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" },
    { circle: [12, 12, 3] },
  ],
  "eye-off": [
    { d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" },
    { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" },
    { d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" },
    { d: "M2 2l20 20" },
  ],
  "more-horizontal": [{ circle: [12, 12, 1] }, { circle: [19, 12, 1] }, { circle: [5, 12, 1] }],
  "chevron-left": [{ d: "m15 18-6-6 6-6" }],
  "chevron-right": [{ d: "m9 18 6-6-6-6" }],
  "chevron-down": [{ d: "m6 9 6 6 6-6" }],
  "arrow-right": [{ d: "M5 12h14M12 5l7 7-7 7" }],
  "panel-left-close": [{ rect: [3, 3, 18, 18, 2] }, { d: "M9 3v18M16 15l-3-3 3-3" }],
  "panel-left-open": [{ rect: [3, 3, 18, 18, 2] }, { d: "M9 3v18M14 9l3 3-3 3" }],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;

/** Los tamaños del kit: un ícono no se dibuja a cualquier medida. */
export const ICON_SIZE = { sm: 16, md: 20, lg: 24 } as const;
export type IconSize = keyof typeof ICON_SIZE;
