import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SECCIONES, seccionDeRuta, type Seccion } from "./secciones";

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

describe("SECCIONES", () => {
  it("el alta y la edición de un edificio marcan Edificios en el menú", () => {
    assert.equal(seccionDeRuta("/edificios", SECCIONES)?.key, "edificios");
    assert.equal(seccionDeRuta("/edificios/nuevo", SECCIONES)?.key, "edificios");
    assert.equal(seccionDeRuta("/edificios/abc-123", SECCIONES)?.key, "edificios");
  });
});
