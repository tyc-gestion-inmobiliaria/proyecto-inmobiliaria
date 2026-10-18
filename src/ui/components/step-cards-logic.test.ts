import assert from "node:assert/strict";
import { test } from "node:test";

import { firstOpenStep, STEP_CARD_TEXTS, stepAccessibilityLabel, stepSign } from "./step-cards-logic";

test("stepSign: ✓ hecho, ! trabado, el número en los demás", () => {
  assert.deepEqual(
    (["done", "blocked", "current", "upcoming"] as const).map((s, i) => stepSign(s, i)),
    ["✓", "!", "3", "4"],
  );
});

test("firstOpenStep: el primero sin terminar, aunque haya hechos después", () => {
  assert.equal(
    firstOpenStep([
      { key: "a", status: "done" },
      { key: "b", status: "blocked" },
      { key: "c", status: "done" },
    ]),
    "b",
  );
  assert.equal(firstOpenStep([{ key: "a", status: "done" }]), undefined);
});

test("stepAccessibilityLabel dice posición, nombre, estado y detalle", () => {
  assert.equal(stepAccessibilityLabel("Presupuesto", 1, 4, "blocked", "falta cargarlo", STEP_CARD_TEXTS), "Paso 2 de 4, Presupuesto, con bloqueos, falta cargarlo");
  assert.equal(stepAccessibilityLabel("Envío", 0, 2, "done", undefined, STEP_CARD_TEXTS), "Paso 1 de 2, Envío, hecho");
});
