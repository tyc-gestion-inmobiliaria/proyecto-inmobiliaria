/**
 * Los tokens del kit, en un solo sitio.
 *
 * Todo lo que el kit pinta sale de acá: colores, tipos, espacios, radios,
 * sombras y alturas de control. Ningún componente escribe un hexadecimal
 * suelto. Cambiar la cara de un proyecto es cambiar este archivo —o pasarle
 * otros valores a `crearTema`— y no buscar colores por cuarenta archivos.
 *
 * Este archivo es **puro**: no importa React Native. Así lo puede leer
 * `scripts/tokens-a-json.ts` desde Node para escribir `tokens/tokens.json`,
 * que es lo que se importa en Figma. Código y diseño comparten una sola
 * fuente.
 *
 * ## Contraste
 *
 * Cada color de texto pasa 4.5:1 sobre los fondos donde se usa. No es una
 * promesa: lo comprueba `tokens.test.ts`, y si alguien cambia un gris y lo
 * deja por debajo, la prueba falla antes de que llegue a pantalla.
 */

/** La escala de grises de la que salen los neutros de los dos temas. */
export const neutral = {
  0: "#ffffff",
  50: "#f7f7f8",
  100: "#efeff1",
  200: "#e2e2e6",
  300: "#cfcfd5",
  400: "#a3a3ad",
  500: "#71717b",
  600: "#5a5a64",
  700: "#43434b",
  800: "#2b2b31",
  900: "#18181c",
  950: "#0e0e11",
} as const;

export interface ColorTokens {
  bg: {
    /** El fondo de la pantalla, detrás de todo. */
    canvas: string;
    /** Tarjetas, tablas, diálogos, campos. */
    surface: string;
    /** Lo de debajo del puntero: el fondo del estado "encima". */
    hover: string;
    /** El fondo del estado "presionado". */
    pressed: string;
    /** Cabeceras de tabla, campos de solo lectura. */
    muted: string;
    /** Controles apagados. */
    disabled: string;
    /** El velo que oscurece la pantalla detrás de un diálogo. */
    scrim: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    placeholder: string;
    /** Texto apagado. WCAG no le pide contraste, pero tiene que leerse. */
    disabled: string;
    /** Texto sobre el color de acento lleno. */
    onAccent: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    /** El borde de lo que tiene el foco o el puntero encima. */
    focus: string;
  };
  accent: {
    /** El color de la marca del proyecto: botón principal, lo elegido. */
    base: string;
    hover: string;
    pressed: string;
    /** El acento rebajado a fondo, para lo elegido en listas y menús. */
    subtle: string;
    /** Texto en color de acento sobre `subtle` o sobre `surface`. */
    text: string;
  };
  success: { fg: string; bg: string };
  warning: { fg: string; bg: string };
  danger: { fg: string; bg: string; hoverBg: string };
  info: { fg: string; bg: string };
  /**
   * Los colores de las gráficas. Van aparte de `accent` y de los de estado
   * porque hacen otro trabajo: distinguir series, medir magnitud o marcar
   * polaridad. Un color de estado (éxito, error) no se usa nunca como "serie 4".
   */
  chart: {
    /**
     * Ocho colores para distinguir series, **en este orden y sin saltarse
     * ninguno**. El orden es lo que los mantiene distinguibles para quien no
     * ve bien los colores (comprobado con el validador de paletas: ΔE ≥ 8
     * entre vecinos). Una serie novena no inventa un color: se junta en
     * "Otras". En claro, el 3, el 4 y el 5 quedan por debajo de 3:1 sobre la
     * superficie, así que toda gráfica lleva leyenda o etiqueta y su tabla.
     */
    series: string[];
    /** Siete pasos de un solo tono, de poco a mucho. Para mapas de calor. */
    sequential: string[];
    /** Por encima del cero: ganancia, a favor. */
    positive: string;
    /** Por debajo del cero: pérdida, en contra. */
    negative: string;
    /** El punto medio de una escala divergente: "nada". */
    neutral: string;
    /** El gris de lo que acompaña: el resto cuando una serie es la noticia. */
    muted: string;
    /** Las líneas de rejilla: finas y recesivas. */
    grid: string;
    /** El eje y la línea del cero. */
    axis: string;
  };
}

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
  letterSpacing?: number;
  family: "sans" | "mono";
  textTransform?: "uppercase" | "none";
  /**
   * `tabular`: todas las cifras miden lo mismo, así una columna de montos
   * alinea sin pasar a letra monoespaciada (que se lee como código).
   */
  numeric?: "tabular";
}

export interface TypographyTokens {
  /**
   * Pilas de fuentes para web. En nativo se usa la del sistema, salvo que la
   * pila empiece por un nombre entre comillas (una fuente que el proyecto
   * incrusta con el plugin de `expo-font`): entonces se usa ese nombre.
   */
  family: { sans: string; mono: string };
  scale: {
    display: TypeStyle;
    title: TypeStyle;
    dialogTitle: TypeStyle;
    subtitle: TypeStyle;
    body: TypeStyle;
    bodySmall: TypeStyle;
    label: TypeStyle;
    caption: TypeStyle;
    data: TypeStyle;
  };
}

export interface ShadowToken {
  boxShadow: string;
  /** Android dibuja la sombra con `elevation`, no con `boxShadow`. */
  elevation: number;
}

export interface Tema {
  name: string;
  scheme: "light" | "dark";
  color: ColorTokens;
  typography: TypographyTokens;
  space: { none: number; xxs: number; xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: { none: number; sm: number; md: number; lg: number; full: number };
  elevation: { none: ShadowToken; sm: ShadowToken; md: ShadowToken; modal: ShadowToken };
  /**
   * Las alturas de lo que se toca.
   *
   * `md` es 44, el mínimo tocable que piden las guías de accesibilidad.
   * `sm` mide 38 para que quepa en una tabla densa, y **compensa con
   * `TouchArea`** (y `hitSlop` en el teléfono): lo que se ve mide 38, lo que
   * responde al dedo mide 44. `hitSlop` solo no sirve en la web.
   */
  control: { sm: number; md: number; lg: number };
  /** El área tocable mínima, para calcular el `hitSlop` de lo que es más chico. */
  minTouch: number;
}

const typography: TypographyTokens = {
  family: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
  scale: {
    display: { fontSize: 32, lineHeight: 38, fontWeight: "600", letterSpacing: -0.4, family: "sans" },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "600", letterSpacing: -0.2, family: "sans" },
    dialogTitle: { fontSize: 18, lineHeight: 24, fontWeight: "600", family: "sans" },
    subtitle: { fontSize: 15, lineHeight: 21, fontWeight: "600", family: "sans" },
    body: { fontSize: 14, lineHeight: 20, fontWeight: "400", family: "sans" },
    bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: "400", family: "sans" },
    label: { fontSize: 11, lineHeight: 14, fontWeight: "500", letterSpacing: 0.8, family: "sans", textTransform: "uppercase" },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400", family: "sans" },
    data: { fontSize: 13, lineHeight: 18, fontWeight: "400", family: "sans", numeric: "tabular" },
  },
};

const comun = {
  typography,
  space: { none: 0, xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { none: 0, sm: 4, md: 8, lg: 12, full: 999 },
  control: { sm: 38, md: 44, lg: 52 },
  minTouch: 44,
} satisfies Omit<Tema, "name" | "scheme" | "color" | "elevation">;

/** El tema que trae la plantilla: neutro, gris con un azul de acento. */
export const lightTheme: Tema = {
  name: "neutral-light",
  scheme: "light",
  ...comun,
  color: {
    bg: {
      canvas: neutral[50],
      surface: neutral[0],
      hover: neutral[100],
      pressed: neutral[200],
      muted: neutral[100],
      disabled: neutral[100],
      scrim: "rgba(14, 14, 17, 0.55)",
    },
    text: {
      primary: neutral[950],
      secondary: neutral[600],
      tertiary: "#62626c",
      placeholder: "#686872",
      disabled: neutral[400],
      onAccent: neutral[0],
    },
    border: {
      subtle: neutral[100],
      default: neutral[200],
      strong: neutral[300],
      focus: neutral[950],
    },
    accent: {
      base: "#2f54c7",
      hover: "#2443a6",
      pressed: "#1c3585",
      subtle: "#ebf0fc",
      text: "#2443a6",
    },
    success: { fg: "#18744a", bg: "#e6f3ec" },
    warning: { fg: "#955600", bg: "#fcf0de" },
    danger: { fg: "#c0122e", bg: "#fdf0f2", hoverBg: "#f9dde2" },
    info: { fg: "#2c5b97", bg: "#e9f0f8" },
    chart: {
      series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
      sequential: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
      positive: "#2a78d6",
      negative: "#e34948",
      neutral: neutral[100],
      muted: "#b9b9c2",
      grid: neutral[100],
      axis: neutral[300],
    },
  },
  elevation: {
    none: { boxShadow: "none", elevation: 0 },
    sm: { boxShadow: "0 1px 3px rgba(14, 14, 17, 0.08)", elevation: 2 },
    md: { boxShadow: "0 6px 16px rgba(14, 14, 17, 0.14)", elevation: 8 },
    modal: { boxShadow: "0 24px 48px rgba(14, 14, 17, 0.32)", elevation: 24 },
  },
};

/** La variante oscura del mismo tema. */
export const darkTheme: Tema = {
  name: "neutral-dark",
  scheme: "dark",
  ...comun,
  color: {
    bg: {
      canvas: neutral[950],
      surface: neutral[900],
      hover: "#24242a",
      pressed: "#303037",
      muted: "#202025",
      disabled: "#24242a",
      scrim: "rgba(0, 0, 0, 0.65)",
    },
    text: {
      primary: "#f4f4f6",
      secondary: "#c6c6ce",
      tertiary: "#a9a9b3",
      placeholder: "#a0a0aa",
      disabled: "#6a6a74",
      onAccent: neutral[950],
    },
    border: {
      subtle: "#24242a",
      default: "#303037",
      strong: "#45454e",
      focus: "#f4f4f6",
    },
    accent: {
      base: "#8ea8ff",
      hover: "#a9bdff",
      pressed: "#c3d1ff",
      subtle: "#1d2540",
      text: "#a9bdff",
    },
    success: { fg: "#6fd3a0", bg: "#13301f" },
    warning: { fg: "#f2b862", bg: "#382810" },
    danger: { fg: "#ff8595", bg: "#3a1219", hoverBg: "#4d1822" },
    info: { fg: "#93bcf2", bg: "#14253c" },
    // Los mismos ocho tonos, con el paso que les toca sobre la superficie
    // oscura: no es la paleta clara invertida, se eligió y validó aparte.
    chart: {
      series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
      sequential: ["#1c2a40", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"],
      positive: "#3987e5",
      negative: "#e66767",
      neutral: "#303037",
      muted: "#55555f",
      grid: "#26262c",
      axis: "#45454e",
    },
  },
  elevation: {
    none: { boxShadow: "none", elevation: 0 },
    sm: { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)", elevation: 2 },
    md: { boxShadow: "0 6px 16px rgba(0, 0, 0, 0.55)", elevation: 8 },
    modal: { boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)", elevation: 24 },
  },
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
