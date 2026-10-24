import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nombreDeMiUnidad, ordenarMisUnidades, unidadElegida, type MiUnidad } from "./mi-unidad";

const u = (id: string, numero: string, edificioNombre: string): MiUnidad => ({ id, numero, edificioId: `e-${edificioNombre}`, edificioNombre });

describe("mis unidades", () => {
  const unidades = [u("c", "201", "Torre Sol"), u("a", "1001", "Residencial Norte"), u("b", "101", "Residencial Norte")];

  it("se ordenan por edificio y por número, con los números como números", () => {
    assert.deepEqual(
      ordenarMisUnidades(unidades).map((x) => x.id),
      ["b", "a", "c"],
    );
  });

  it("se nombran con el número y el edificio", () => {
    assert.equal(nombreDeMiUnidad(unidades[0]), "201 · Torre Sol");
  });

  it("se abre la elegida si sigue siendo suya; si no, la primera", () => {
    assert.equal(unidadElegida(unidades, "a")?.id, "a");
    assert.equal(unidadElegida(unidades, "otra")?.id, "c");
    assert.equal(unidadElegida([], null), null);
  });
});
