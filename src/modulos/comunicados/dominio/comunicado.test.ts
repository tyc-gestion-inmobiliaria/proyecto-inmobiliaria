import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extracto, ordenarComunicados, puedeEditarse, validarComunicado, type Comunicado } from "./comunicado";

function com(id: string, extra: Partial<Comunicado> = {}): Comunicado {
  return { id, edificioId: "e", titulo: "t", cuerpo: "c", audiencia: "todos", estado: "borrador", editadoEl: "2026-10-01", publicadoEl: null, ...extra };
}

describe("comunicados", () => {
  it("un borrador solo pide título; publicar pide todo", () => {
    assert.deepEqual(validarComunicado({ titulo: "Corte de agua", cuerpo: "", audiencia: undefined }, "borrador"), {});
    assert.deepEqual(Object.keys(validarComunicado({ titulo: "Corte de agua", cuerpo: " ", audiencia: undefined }, "publicar")).sort(), ["audiencia", "cuerpo"]);
    assert.equal(validarComunicado({ titulo: "", cuerpo: "x", audiencia: "todos" }, "borrador").titulo, "Escribe el título.");
  });

  it("uno publicado ya no se edita", () => {
    assert.equal(puedeEditarse(com("a")), true);
    assert.equal(puedeEditarse(com("b", { estado: "publicado", publicadoEl: "2026-10-02" })), false);
  });

  it("ordena el más reciente arriba", () => {
    const r = ordenarComunicados([com("viejo", { editadoEl: "2026-09-01" }), com("nuevo", { editadoEl: "2026-10-10" }), com("pub", { publicadoEl: "2026-10-05" })]);
    assert.deepEqual(r.map((c) => c.id), ["nuevo", "pub", "viejo"]);
  });

  it("corta el extracto en una línea", () => {
    assert.equal(extracto("Hola\n\nvecinos"), "Hola vecinos");
    assert.equal(extracto("a".repeat(200), 10), `${"a".repeat(9)}…`);
  });
});
