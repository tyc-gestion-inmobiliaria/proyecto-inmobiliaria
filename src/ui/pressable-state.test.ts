import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hitSlopFor, pickByInteraction, resolveInteraction } from "./pressable-state";

describe("resolveInteraction", () => {
  it("reposo sin nada", () => {
    assert.equal(resolveInteraction({ pressed: false }), "rest");
  });
  it("encima con el puntero", () => {
    assert.equal(resolveInteraction({ pressed: false, hovered: true }), "hovered");
  });
  it("presionado gana al hover", () => {
    assert.equal(resolveInteraction({ pressed: true, hovered: true }), "pressed");
  });
  it("elegido gana al hover y al presionado", () => {
    assert.equal(resolveInteraction({ pressed: true, hovered: true }, { selected: true }), "selected");
  });
  it("apagado gana a todo", () => {
    assert.equal(
      resolveInteraction({ pressed: true, hovered: true }, { selected: true, disabled: true, forced: "pressed" }),
      "disabled",
    );
  });
  it("un estado forzado se pinta sin puntero", () => {
    assert.equal(resolveInteraction({ pressed: false }, { forced: "hovered" }), "hovered");
    assert.equal(resolveInteraction({ pressed: false }, { forced: "pressed" }), "pressed");
    assert.equal(resolveInteraction({ pressed: false }, { forced: "selected" }), "selected");
  });
});

describe("pickByInteraction", () => {
  it("cae en el reposo si el estado no se declaró", () => {
    assert.equal(pickByInteraction("hovered", { rest: "a" }), "a");
  });
  it("usa el valor del estado si existe", () => {
    assert.equal(pickByInteraction("pressed", { rest: "a", pressed: "b" }), "b");
  });
});

describe("hitSlopFor", () => {
  it("lleva un control de 38 a 44", () => {
    assert.equal(hitSlopFor(38), 3);
  });
  it("no agrega nada a lo que ya llega", () => {
    assert.equal(hitSlopFor(44), 0);
    assert.equal(hitSlopFor(52), 0);
  });
  it("redondea hacia arriba", () => {
    assert.equal(hitSlopFor(31), 7);
  });
});
