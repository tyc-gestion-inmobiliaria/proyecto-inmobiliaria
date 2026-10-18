import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { seccionDeRuta, type Seccion } from "./secciones";

const secciones = [
  { key: "inicio", label: "Inicio", ruta: "/" },
  { key: "padron", label: "Padrón", ruta: "/padron" },
] as unknown as Seccion[];

describe("seccionDeRuta", () => {
  it("la raíz es Inicio", () => {
    assert.equal(seccionDeRuta("/", secciones)?.key, "inicio");
  });

  it("una ruta anidada marca su sección, no la raíz", () => {
    assert.equal(seccionDeRuta("/padron/edificio/1", secciones)?.key, "padron");
  });

  it("un prefijo parecido no cuenta como la sección", () => {
    assert.equal(seccionDeRuta("/padronx", secciones)?.key, "inicio");
  });
});
