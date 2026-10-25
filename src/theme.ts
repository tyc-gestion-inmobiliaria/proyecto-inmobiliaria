/**
 * El tema de este proyecto.
 *
 * Es el único sitio que se toca para darle la cara de un cliente: el color de
 * marca, el radio, la fuente. Lo que no se escribe acá se hereda del tema
 * neutro de la plantilla (`src/ui/tokens.ts`).
 *
 * - **Siempre en claro** (lo pidió el cliente): el oscuro queda definido abajo.
 * - **Color:** los de la web de T&C (tc-inmobiliaria.com): el bronce dorado
 *   de su acento (#AD9271) y el carbón de sus botones (#181818), sobre grises
 *   apenas cálidos. Su bronce sobre blanco no llega a 4.5:1, así que el acento
 *   es el mismo tono más oscuro (#7a5d38, 6.1:1 con texto blanco); en el modo
 *   oscuro, más claro. No compite con los colores de estado (ámbar para lo que
 *   falta, rojo para lo vencido). Cada texto pasa 4.5:1 sobre sus fondos: lo
 *   mide `tokens.test.ts`.
 *   Supuesto: la web es la referencia de marca mientras el cliente no entregue
 *   su manual (pregunta abierta en el backlog).
 * - **Letra:** las dos de la web de T&C: Lato para los títulos (pantalla,
 *   cifra grande, diálogo) y Heebo para todo lo demás. 400 para el cuerpo,
 *   600 para botones y títulos de tarjeta, 700 para el título. Las
 *   cifras van en la misma familia con números tabulares, no en monoespaciada.
 *   La fuente vive en `assets/fonts/` (licencia OFL, subconjunto latino, con
 *   tildes y eñe); en web la carga
 *   `src/shared/ui/font.web.ts`, y en iOS y Android va incrustada con el
 *   plugin de `expo-font` (`app.json`).
 * - **Formas (una sola regla, no se mezcla):** campos y botones con radio 10
 *   (`sm`); tarjetas, tablas y diálogos con 16 (`md`); fotos y paneles
 *   grandes con 24 (`lg`); insignias y fichas en píldora (`full`). Las
 *   tarjetas se separan del fondo con una sombra suave y un borde casi
 *   invisible, no con una línea dura: con radios chicos y bordes marcados
 *   la app se veía cuadrada, una caja dentro de otra.
 *
 * Este archivo es puro (no importa React Native): lo leen las pruebas.
 */
import { crearTema } from "./ui/theme/create-theme";
import { darkTheme, lightTheme, type TypographyTokens } from "./ui/tokens";

/** El nombre con el que se registra la fuente, en web y en nativo. */
export const FUENTE = "Heebo";
/** La de los títulos: Lato, como los titulares de la web de T&C. */
export const FUENTE_DE_TITULOS = "Lato";

const tipografia: TypographyTokens = {
  family: {
    sans: `"${FUENTE}", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    mono: lightTheme.typography.family.mono,
    display: `"${FUENTE_DE_TITULOS}", "${FUENTE}", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  },
  scale: {
    display: { fontSize: 30, lineHeight: 38, fontWeight: "700", letterSpacing: -0.3, family: "display" },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.2, family: "display" },
    dialogTitle: { fontSize: 18, lineHeight: 26, fontWeight: "700", family: "display" },
    subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", letterSpacing: -0.1, family: "sans" },
    body: { fontSize: 14, lineHeight: 21, fontWeight: "400", family: "sans" },
    bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: "400", family: "sans" },
    label: { fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 0.6, family: "sans", textTransform: "uppercase" },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", family: "sans" },
    data: { fontSize: 14, lineHeight: 20, fontWeight: "500", family: "sans", numeric: "tabular" },
  },
};

const comun = {
  typography: tipografia,
  radius: { none: 0, sm: 10, md: 16, lg: 24, full: 999 },
};

export const temaDelProyecto = crearTema({
  name: "proyecto",
  ...comun,
  color: {
    bg: {
      canvas: "#f6f5f3",
      surface: "#ffffff",
      hover: "#f1efec",
      pressed: "#e6e2dc",
      muted: "#f3f1ee",
      disabled: "#f1efec",
      scrim: "rgba(24, 24, 24, 0.55)",
    },
    text: {
      primary: "#181818",
      secondary: "#4f4f4f",
      tertiary: "#5f5f5f",
      placeholder: "#666666",
      disabled: "#a8a29a",
      onAccent: "#ffffff",
    },
    border: { subtle: "#efece8", default: "#e3dfd9", strong: "#cdc7be", focus: "#7a5d38" },
    accent: { base: "#7a5d38", hover: "#6b5130", pressed: "#5a4428", subtle: "#f5efe6", text: "#6e5434" },
    success: { fg: "#15803d", bg: "#ecfdf3" },
    warning: { fg: "#a14a06", bg: "#fff7e6" },
    danger: { fg: "#c42020", bg: "#fef2f2", hoverBg: "#fde4e4" },
    info: { fg: "#1d4ed8", bg: "#eff5ff" },
  },
  elevation: {
    none: { boxShadow: "none", elevation: 0 },
    // Sombras cálidas (del carbón de la marca), bajas y difusas: separan sin dibujar una caja.
    sm: { boxShadow: "0 1px 2px rgba(24, 24, 24, 0.04), 0 6px 20px rgba(24, 24, 24, 0.05)", elevation: 1 },
    md: { boxShadow: "0 10px 30px rgba(24, 24, 24, 0.10)", elevation: 6 },
    modal: { boxShadow: "0 24px 48px rgba(24, 24, 24, 0.22)", elevation: 24 },
  },
});

/** La variante oscura: la misma cara, elegida y medida aparte (no es la clara invertida). */
export const temaOscuroDelProyecto = crearTema(
  {
    name: "proyecto-oscuro",
    ...comun,
    color: {
      bg: {
        canvas: "#141312",
        surface: "#1c1b19",
        hover: "#262420",
        pressed: "#302d28",
        muted: "#211f1c",
        disabled: "#262420",
        scrim: "rgba(0, 0, 0, 0.7)",
      },
      text: {
        primary: "#f4f2ef",
        secondary: "#d6d1ca",
        tertiary: "#b5afa6",
        placeholder: "#a8a29a",
        disabled: "#6b665f",
        onAccent: "#1a1408",
      },
      border: { subtle: "#24221f", default: "#2f2c28", strong: "#45413b", focus: "#d7c09c" },
      accent: { base: "#c9ad84", hover: "#d7c09c", pressed: "#e4d3b6", subtle: "#2a241b", text: "#d7c09c" },
      success: { fg: "#4ade80", bg: "#0d2a1b" },
      warning: { fg: "#fbbf24", bg: "#2e2108" },
      danger: { fg: "#fc8181", bg: "#331317", hoverBg: "#45191e" },
      info: { fg: "#93c5fd", bg: "#122440" },
    },
    elevation: {
      none: { boxShadow: "none", elevation: 0 },
      sm: { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.4)", elevation: 1 },
      md: { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)", elevation: 6 },
      modal: { boxShadow: "0 24px 48px rgba(0, 0, 0, 0.65)", elevation: 24 },
    },
  },
  darkTheme,
);
