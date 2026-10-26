import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { edificioDeLaRuta, edificioEnCurso, rutaAlCambiarDeEdificio, TODA_LA_CARTERA } from "./context";

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

describe("edificioDeLaRuta", () => {
  it("lee el edificio de la dirección", () => {
    assert.equal(edificioDeLaRuta("/buildings/e1"), "e1");
    assert.equal(edificioDeLaRuta("/buildings/e1/units/u3/edit"), "e1");
  });

  it("el alta y las demás secciones no nombran edificio", () => {
    assert.equal(edificioDeLaRuta("/buildings/new"), null);
    assert.equal(edificioDeLaRuta("/buildings"), null);
    assert.equal(edificioDeLaRuta("/payments"), null);
  });
});

describe("rutaAlCambiarDeEdificio", () => {
  it("fuera de un edificio no navega", () => {
    assert.equal(rutaAlCambiarDeEdificio("/reservations", "e2"), null);
  });

  it("el cierre lleva al cierre del otro edificio", () => {
    assert.equal(rutaAlCambiarDeEdificio("/buildings/e1/closing", "e2"), "/buildings/e2/closing");
  });

  it("lo que es de un solo edificio lleva a las unidades del otro", () => {
    assert.equal(rutaAlCambiarDeEdificio("/buildings/e1/units/u3", "e2"), "/buildings/e2/units");
    assert.equal(rutaAlCambiarDeEdificio("/buildings/e1/accounts/new", "e2"), "/buildings/e2/units");
  });

  it("toda la cartera vuelve a la lista de edificios", () => {
    assert.equal(rutaAlCambiarDeEdificio("/buildings/e1/units", null), "/buildings");
  });

  it("elegir el mismo edificio no navega", () => {
    assert.equal(rutaAlCambiarDeEdificio("/buildings/e1/units", "e1"), null);
  });
});
