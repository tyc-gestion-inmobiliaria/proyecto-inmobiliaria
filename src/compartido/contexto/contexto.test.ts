import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { edificioEnCurso, TODA_LA_CARTERA } from "./contexto";

const edificios = [
  { id: "e1", nombre: "Edificio 1" },
  { id: "e2", nombre: "Edificio 2" },
];

describe("edificioEnCurso", () => {
  it("sin elegir es la cartera entera", () => {
    assert.equal(edificioEnCurso(edificios, null), null);
    assert.equal(edificioEnCurso(edificios, TODA_LA_CARTERA), null);
  });

  it("devuelve el elegido", () => {
    assert.deepEqual(edificioEnCurso(edificios, "e2"), edificios[1]);
  });

  it("un elegido que ya no está vuelve a la cartera", () => {
    assert.equal(edificioEnCurso(edificios, "e9"), null);
  });
});
