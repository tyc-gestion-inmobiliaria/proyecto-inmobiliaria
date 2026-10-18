import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { darkTheme, lightTheme } from "../tokens";
import { crearTema, deepMerge } from "./create-theme";

describe("crearTema", () => {
  it("sin cambios devuelve el neutro claro", () => {
    assert.deepEqual(crearTema(), lightTheme);
  });

  it("cambia solo la hoja tocada y hereda las hermanas", () => {
    const t = crearTema({ name: "acme", color: { accent: { base: "#0a7d5a" } } });
    assert.equal(t.name, "acme");
    assert.equal(t.color.accent.base, "#0a7d5a");
    assert.equal(t.color.accent.hover, lightTheme.color.accent.hover);
    assert.deepEqual(t.color.text, lightTheme.color.text);
    assert.deepEqual(t.typography, lightTheme.typography);
  });

  it("no muta la base", () => {
    const antes = JSON.stringify(lightTheme);
    crearTema({ radius: { md: 2 }, color: { bg: { canvas: "#000000" } } });
    assert.equal(JSON.stringify(lightTheme), antes);
  });

  it("parte del oscuro cuando se le pasa como base", () => {
    const t = crearTema({ radius: { md: 0 } }, darkTheme);
    assert.equal(t.scheme, "dark");
    assert.equal(t.radius.md, 0);
    assert.equal(t.color.bg.canvas, darkTheme.color.bg.canvas);
  });
});

describe("deepMerge", () => {
  it("un undefined no borra lo heredado", () => {
    assert.deepEqual(deepMerge({ a: 1, b: { c: 2 } }, { a: undefined, b: { c: 3 } }), { a: 1, b: { c: 3 } });
  });
  it("los arreglos se reemplazan, no se mezclan", () => {
    assert.deepEqual(deepMerge({ a: [1, 2] }, { a: [3] }), { a: [3] });
  });
});
