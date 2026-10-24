/**
 * El tema de este proyecto.
 *
 * Es el único sitio que se toca para darle la cara de un cliente: el color de
 * marca, el radio, la fuente. Lo que no se escribe acá se hereda del tema
 * neutro de la plantilla (`src/ui/tokens.ts`).
 *
 * - **Color:** un verde azulado (teal) de acento sobre neutros pizarra (slate),
 *   la paleta de administración de inmuebles: sobria, de confianza, y que no
 *   compite con los colores de estado (ámbar para lo que falta, rojo para lo
 *   vencido). Cada texto pasa 4.5:1 sobre sus fondos: lo mide `tokens.test.ts`.
 * - **Letra:** Plus Jakarta Sans, una sola familia. 400 para el cuerpo, 600
 *   para botones y títulos de tarjeta, 700 para el título de la pantalla. Las
 *   cifras van en la misma familia con números tabulares, no en monoespaciada.
 *   La fuente vive en `assets/fonts/` (licencia OFL); en web la carga
 *   `src/compartido/ui/fuente.web.ts`, y en iOS y Android va incrustada con el
 *   plugin de `expo-font` (`app.json`).
 * - **Radios:** algo más redondos que el neutro, sin llegar a la píldora.
 *
 * Este archivo es puro (no importa React Native): lo leen las pruebas.
 */
import { crearTema } from "./ui/theme/create-theme";
import { darkTheme, lightTheme, type TypographyTokens } from "./ui/tokens";

/** El nombre con el que se registra la fuente, en web y en nativo. */
export const FUENTE = "Plus Jakarta Sans";

const tipografia: TypographyTokens = {
  family: {
    sans: `"${FUENTE}", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    mono: lightTheme.typography.family.mono,
  },
  scale: {
    display: { fontSize: 30, lineHeight: 38, fontWeight: "700", letterSpacing: -0.6, family: "sans" },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.4, family: "sans" },
    dialogTitle: { fontSize: 18, lineHeight: 26, fontWeight: "700", letterSpacing: -0.2, family: "sans" },
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
  radius: { none: 0, sm: 8, md: 12, lg: 16, full: 999 },
};

export const temaDelProyecto = crearTema({
  name: "proyecto",
  ...comun,
  color: {
    bg: {
      canvas: "#f8fafc",
      surface: "#ffffff",
      hover: "#f1f5f9",
      pressed: "#e2e8f0",
      muted: "#f1f5f9",
      disabled: "#f1f5f9",
      scrim: "rgba(15, 23, 42, 0.55)",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
      tertiary: "#56657a",
      placeholder: "#5b6a7e",
      disabled: "#94a3b8",
      onAccent: "#ffffff",
    },
    border: { subtle: "#eef2f6", default: "#e2e8f0", strong: "#cbd5e1", focus: "#0f766e" },
    accent: { base: "#0f766e", hover: "#115e59", pressed: "#134e4a", subtle: "#e6f6f4", text: "#0f6b64" },
    success: { fg: "#15803d", bg: "#ecfdf3" },
    warning: { fg: "#a14a06", bg: "#fff7e6" },
    danger: { fg: "#c42020", bg: "#fef2f2", hoverBg: "#fde4e4" },
    info: { fg: "#1d4ed8", bg: "#eff5ff" },
  },
  elevation: {
    none: { boxShadow: "none", elevation: 0 },
    sm: { boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)", elevation: 1 },
    md: { boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)", elevation: 6 },
    modal: { boxShadow: "0 24px 48px rgba(15, 23, 42, 0.24)", elevation: 24 },
  },
});

/** La variante oscura: la misma cara, elegida y medida aparte (no es la clara invertida). */
export const temaOscuroDelProyecto = crearTema(
  {
    name: "proyecto-oscuro",
    ...comun,
    color: {
      bg: {
        canvas: "#0b1220",
        surface: "#111a2b",
        hover: "#1a2538",
        pressed: "#233046",
        muted: "#162135",
        disabled: "#1a2538",
        scrim: "rgba(2, 6, 23, 0.7)",
      },
      text: {
        primary: "#f1f5f9",
        secondary: "#cbd5e1",
        tertiary: "#a3b1c4",
        placeholder: "#9aa8bb",
        disabled: "#5b6b82",
        onAccent: "#042f2e",
      },
      border: { subtle: "#18233a", default: "#223049", strong: "#33435e", focus: "#5eead4" },
      accent: { base: "#2dd4bf", hover: "#5eead4", pressed: "#99f6e4", subtle: "#0f2f33", text: "#5eead4" },
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
