/**
 * Escribe los tokens de `src/ui/tokens.ts` en formato W3C Design Tokens
 * (`$value`, `$type`), para que Figma y el código lean de la misma fuente.
 *
 *   npm run tokens
 *
 * Deja tres archivos:
 *
 * - `tokens/tokens.json`: un solo archivo con tres conjuntos —`core`, `light`
 *   y `dark`— y la lista de temas, como lo lee Tokens Studio.
 * - `tokens/figma/light.tokens.json` y `dark.tokens.json`: cada modo completo
 *   en un archivo, que es lo que pide la importación nativa de variables de
 *   Figma (un archivo por modo).
 *
 * Con `--check` no escribe: falla si lo que hay en disco no coincide con el
 * TS. Lo corre el CI para que nadie edite el JSON a mano.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { darkTheme, lightTheme, type ShadowToken, type Tema } from "../src/ui/tokens";

type Token = { $type: string; $value: unknown; $description?: string };
type Group = { [key: string]: Token | Group | string | undefined; $type?: string; $description?: string };

const px = (n: number) => `${n}px`;

/** Las hojas de un objeto de colores, cada una como token `color`. */
function colores(obj: Record<string, unknown>): Group {
  const out: Group = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? { $type: "color", $value: v } : colores(v as Record<string, unknown>);
  }
  return out;
}

function dimensiones(obj: Record<string, number>): Group {
  const out: Group = {};
  for (const [k, v] of Object.entries(obj)) out[k] = { $type: "dimension", $value: px(v) };
  return out;
}

/**
 * `"0 6px 16px rgba(…)"` → la sombra compuesta de W3C. Admite una sola capa,
 * que es lo que usa el kit.
 */
export function sombra(s: ShadowToken): Token {
  if (s.boxShadow === "none") {
    return { $type: "shadow", $value: { color: "#00000000", offsetX: "0px", offsetY: "0px", blur: "0px", spread: "0px" } };
  }
  const m = s.boxShadow.match(/^(-?\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(\d+)(?:px)?(?:\s+(-?\d+)(?:px)?)?\s+(.+)$/);
  if (!m) throw new Error(`Sombra que no sé leer: ${s.boxShadow}`);
  return {
    $type: "shadow",
    $value: {
      color: m[5].trim(),
      offsetX: px(Number(m[1])),
      offsetY: px(Number(m[2])),
      blur: px(Number(m[3])),
      spread: px(Number(m[4] ?? 0)),
    },
    $description: `Android: elevation ${s.elevation}`,
  };
}

function core(t: Tema): Group {
  const tipos: Group = {};
  for (const [nombre, s] of Object.entries(t.typography.scale)) {
    tipos[nombre] = {
      $type: "typography",
      $value: {
        fontFamily: `{typography.family.${s.family}}`,
        fontSize: px(s.fontSize),
        fontWeight: Number(s.fontWeight),
        lineHeight: px(s.lineHeight),
        letterSpacing: px(s.letterSpacing ?? 0),
        ...(s.textTransform === "uppercase" ? { textCase: "uppercase" } : {}),
      },
    };
  }
  return {
    typography: {
      family: {
        sans: { $type: "fontFamily", $value: t.typography.family.sans },
        mono: { $type: "fontFamily", $value: t.typography.family.mono },
      },
      scale: tipos,
    },
    space: dimensiones(t.space),
    radius: dimensiones(t.radius),
    control: {
      ...dimensiones(t.control),
      $description: "Alturas de control. md es el mínimo tocable; sm compensa con hitSlop.",
    },
    minTouch: { $type: "dimension", $value: px(t.minTouch) },
  };
}

function modo(t: Tema): Group {
  const elevation: Group = {};
  for (const [k, v] of Object.entries(t.elevation)) elevation[k] = sombra(v);
  return { color: colores(t.color as unknown as Record<string, unknown>), elevation };
}

export function buildTokens() {
  return {
    core: core(lightTheme),
    light: modo(lightTheme),
    dark: modo(darkTheme),
    $themes: [
      { id: "light", name: "Light", selectedTokenSets: { core: "source", light: "enabled" } },
      { id: "dark", name: "Dark", selectedTokenSets: { core: "source", dark: "enabled" } },
    ],
    $metadata: { tokenSetOrder: ["core", "light", "dark"] },
  };
}

/** Un modo completo en un archivo, para la importación nativa de Figma. */
export function buildFigmaMode(t: Tema) {
  return { ...core(t), ...modo(t) };
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const salidas: [string, unknown][] = [
  ["tokens/tokens.json", buildTokens()],
  ["tokens/figma/light.tokens.json", buildFigmaMode(lightTheme)],
  ["tokens/figma/dark.tokens.json", buildFigmaMode(darkTheme)],
];

function main() {
  const comprobar = process.argv.includes("--check");
  let desfasados = 0;
  for (const [ruta, datos] of salidas) {
    const destino = join(raiz, ruta);
    const texto = JSON.stringify(datos, null, 2) + "\n";
    if (comprobar) {
      let actual = "";
      try {
        actual = readFileSync(destino, "utf8").replace(/\r\n/g, "\n");
      } catch {
        // No existe: cuenta como desfasado.
      }
      if (actual !== texto) {
        console.error(`${ruta} no coincide con src/ui/tokens.ts. Corre: npm run tokens`);
        desfasados++;
      }
    } else {
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, texto);
      console.log(`escrito ${ruta}`);
    }
  }
  if (desfasados > 0) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
