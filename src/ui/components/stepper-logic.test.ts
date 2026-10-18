import assert from "node:assert/strict";
import { test } from "node:test";

import { canStep, stepValue } from "./stepper-logic";

test("el paso no se sale de los topes", () => {
  assert.equal(stepValue(1, 1, 1, 5), 2);
  assert.equal(stepValue(5, 1, 1, 5), 5);
  assert.equal(stepValue(1, -1, 1, 5), 1);
  assert.equal(stepValue(3, 10, 1, 5), 5);
  assert.equal(stepValue(Number.NaN, 1, 1, 5), 2, "un valor roto arranca desde el mínimo");
});

test("en el tope se apaga el botón de ese lado, no el otro", () => {
  assert.deepEqual(canStep(1, 1, 5), { down: false, up: true });
  assert.deepEqual(canStep(5, 1, 5), { down: true, up: false });
  assert.deepEqual(canStep(3, 1, 5), { down: true, up: true });
  assert.deepEqual(canStep(1, 1, 1), { down: false, up: false });
});
