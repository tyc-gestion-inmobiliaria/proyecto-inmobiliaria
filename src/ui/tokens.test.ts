import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contrastRatio, MIN_TEXT_CONTRAST } from "./theme/contrast";
import { temaDelProyecto, temaOscuroDelProyecto } from "../theme";
import { darkTheme, lightTheme, type Tema } from "./tokens";

/**
 * Cada texto contra cada fondo donde aparece. Si alguien aclara un gris y lo
 * deja por debajo de 4.5:1, esto falla antes de que llegue a pantalla.
 */
function pares(t: Tema): [string, string, string][] {
  const c = t.color;
  const fondos = { canvas: c.bg.canvas, surface: c.bg.surface, hover: c.bg.hover, muted: c.bg.muted };
  const textos = {
    primary: c.text.primary,
    secondary: c.text.secondary,
    tertiary: c.text.tertiary,
    placeholder: c.text.placeholder,
  };
  const out: [string, string, string][] = [];
  for (const [nt, ct] of Object.entries(textos)) {
    for (const [nf, cf] of Object.entries(fondos)) out.push([`text.${nt} / bg.${nf}`, ct, cf]);
  }
  out.push(["text.onAccent / accent.base", c.text.onAccent, c.accent.base]);
  out.push(["text.onAccent / accent.hover", c.text.onAccent, c.accent.hover]);
  out.push(["text.onAccent / accent.pressed", c.text.onAccent, c.accent.pressed]);
  out.push(["accent.text / accent.subtle", c.accent.text, c.accent.subtle]);
  out.push(["accent.text / bg.surface", c.accent.text, c.bg.surface]);
  out.push(["text.primary / accent.subtle", c.text.primary, c.accent.subtle]);
  for (const s of ["success", "warning", "danger", "info"] as const) {
    out.push([`${s}.fg / ${s}.bg`, c[s].fg, c[s].bg]);
    out.push([`${s}.fg / bg.surface`, c[s].fg, c.bg.surface]);
  }
  out.push(["danger.fg / danger.hoverBg", c.danger.fg, c.danger.hoverBg]);
  out.push(["text.onAccent / danger.fg (chip de alerta elegido)", c.text.onAccent, c.danger.fg]);
  return out;
}

// El del proyecto entra también: un tema hecho con crearTema tiene que cumplir lo mismo.
for (const tema of [lightTheme, darkTheme, temaDelProyecto, temaOscuroDelProyecto]) {
  describe(`contraste del tema ${tema.name}`, () => {
    for (const [nombre, texto, fondo] of pares(tema)) {
      it(`${nombre} llega a ${MIN_TEXT_CONTRAST}:1`, () => {
        const r = contrastRatio(texto, fondo);
        assert.ok(r >= MIN_TEXT_CONTRAST, `${nombre}: ${r.toFixed(2)}:1 (${texto} sobre ${fondo})`);
      });
    }
  });
}

describe("medidas", () => {
  it("el control mediano es el mínimo tocable", () => {
    assert.equal(lightTheme.control.md, lightTheme.minTouch);
    assert.ok(lightTheme.minTouch >= 44);
  });
});

describe("contrastRatio", () => {
  it("negro sobre blanco da 21", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  });
  it("es simétrico y acepta #rgb", () => {
    assert.equal(contrastRatio("#fff", "#000"), contrastRatio("#000000", "#ffffff"));
  });
  it("rechaza lo que no es un color", () => {
    assert.throws(() => contrastRatio("rojo", "#fff"));
  });
});
