import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { avanceDelRecorrido, ordenDelRecorrido, siguientePendiente } from "./rounds";

const l = (id: string, unidadNumero: string, actual: number | null) => ({ id, unidadNumero, actual });

describe("ordenDelRecorrido", () => {
  it("va piso por piso, con los números comparados como números", () => {
    const orden = ordenDelRecorrido([l("a", "1001", null), l("b", "201", null), l("c", "101", null), l("d", "L-2", null)]);
    assert.deepEqual(
      orden.map((x) => x.unidadNumero),
      ["101", "201", "1001", "L-2"],
    );
  });
});

describe("siguientePendiente", () => {
  const lecturas = [l("a", "101", 10), l("b", "102", null), l("c", "201", 12), l("d", "202", null)];

  it("sin punto de partida, la primera que falta", () => {
    assert.equal(siguientePendiente(lecturas)?.id, "b");
  });

  it("después de una, la próxima que falta", () => {
    assert.equal(siguientePendiente(lecturas, "b")?.id, "d");
    assert.equal(siguientePendiente(lecturas, "c")?.id, "d");
  });

  it("al final da la vuelta", () => {
    assert.equal(siguientePendiente(lecturas, "d")?.id, "b");
  });

  it("si no falta ninguna, ninguna", () => {
    assert.equal(siguientePendiente([l("a", "101", 1), l("b", "102", 2)], "a"), null);
    assert.equal(siguientePendiente([]), null);
  });

  it("la que se acaba de guardar no se repite aunque siga vacía", () => {
    assert.equal(siguientePendiente([l("a", "101", null)], "a"), null);
  });
});

describe("avanceDelRecorrido", () => {
  it("cuenta las hechas y las que faltan", () => {
    assert.deepEqual(avanceDelRecorrido([l("a", "1", 1), l("b", "2", null), l("c", "3", null)]), {
      hechas: 1,
      total: 3,
      faltan: 2,
      texto: "1 de 3",
    });
  });
});
