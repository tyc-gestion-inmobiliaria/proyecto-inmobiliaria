import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clasificarFallo } from "./clasificar-fallo";

describe("clasificarFallo", () => {
  it("traduce los códigos de Postgres y PostgREST", () => {
    assert.equal(clasificarFallo({ code: "23505", message: "duplicate key" }), "nombre-repetido");
    assert.equal(clasificarFallo({ code: "42501", message: "new row violates row-level security policy" }), "sin-permiso");
    assert.equal(clasificarFallo({ code: "PGRST116", message: "0 rows" }), "no-existe");
  });

  it("reconoce la falta de red en la web y en el teléfono", () => {
    assert.equal(clasificarFallo({ code: "", message: "TypeError: Failed to fetch" }), "sin-conexion");
    assert.equal(clasificarFallo({ message: "Network request failed" }), "sin-conexion");
  });

  it("lo demás es desconocido", () => {
    assert.equal(clasificarFallo({ code: "XX000", message: "boom" }), "desconocido");
    assert.equal(clasificarFallo(null), "desconocido");
  });
});
