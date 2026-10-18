import assert from "node:assert/strict";
import { test } from "node:test";

import { levelPositions, levelZone } from "./level-logic";

test("la zona: vacío en cero, bajo en el piso o menos, alto pasado el techo", () => {
  assert.equal(levelZone(0, 5, 20), "empty");
  assert.equal(levelZone(-1, 5, 20), "empty");
  assert.equal(levelZone(Number.NaN, 5, 20), "empty");
  assert.equal(levelZone(5, 5, 20), "low");
  assert.equal(levelZone(5.5, 5, 20), "ok");
  assert.equal(levelZone(20, 5, 20), "ok");
  assert.equal(levelZone(21, 5, 20), "high");
});

test("las posiciones dejan sitio pasado el techo y no esconden un valor chico", () => {
  const p = levelPositions(10, 5, 20);
  assert.equal(p.max, 25);
  assert.deepEqual([p.fill, p.low, p.high], [40, 20, 80]);
  assert.equal(levelPositions(0.01, 5, 20).fill, 2);
  assert.equal(levelPositions(0, 5, 20).fill, 0);
  // Pasado el tope, el valor manda la escala.
  const alto = levelPositions(50, 5, 20);
  assert.deepEqual([alto.max, alto.fill, alto.high], [50, 100, 40]);
  assert.equal(levelPositions(3, 5, 20, 100).max, 100);
});
