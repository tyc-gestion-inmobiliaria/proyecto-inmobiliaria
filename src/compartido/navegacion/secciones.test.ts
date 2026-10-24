import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ordenarPorTramo, SECCIONES, seccionDeRuta, seccionesDelModo, seccionesDelRol, type Seccion } from "./secciones";

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

describe("Pagos", () => {
  it("la cola de pagos tiene su sección en Operación", () => {
    const pagos = seccionDeRuta("/pagos", SECCIONES);
    assert.equal(pagos?.key, "pagos");
    assert.equal(pagos?.grupo, "Operación");
  });
});

describe("ordenarPorTramo", () => {
  it("pone primero las sin tramo y después Operación y Gestión, sin mezclar", () => {
    const desordenadas = [
      { key: "reportes", grupo: "Gestión" as const },
      { key: "cobranza", grupo: "Operación" as const },
      { key: "inicio" },
      { key: "reservas", grupo: "Operación" as const },
    ];
    assert.deepEqual(
      ordenarPorTramo(desordenadas).map((s) => s.key),
      ["inicio", "cobranza", "reservas", "reportes"],
    );
  });
});

describe("seccionesDelModo", () => {
  it("con datos reales quedan solo las que tienen función", () => {
    const claves = seccionesDelModo(false).map((s) => s.key);
    assert.deepEqual(claves, ["inicio", "edificios", "lecturas", "pagos", "usuarios"]);
  });
  it("la maqueta muestra las once del mapa más lecturas, pagos y usuarios", () => {
    assert.equal(seccionesDelModo(true).length, 14);
  });
});

describe("seccionesDelRol", () => {
  it("Usuarios solo la ve el administrador", () => {
    const claves = (rol?: string) => seccionesDelRol(rol).map((s) => s.key);
    assert.ok(claves("administrador").includes("usuarios"));
    assert.equal(claves("personal").includes("usuarios"), false);
    assert.equal(claves("residente").includes("usuarios"), false);
    assert.equal(claves(undefined).includes("usuarios"), false);
    assert.ok(claves("personal").includes("edificios"));
  });
  it("el residente no ve la gestión: ni edificios, ni lecturas, ni pagos", () => {
    const claves = seccionesDelRol("residente").map((s) => s.key);
    for (const k of ["edificios", "lecturas", "pagos", "cobranza", "usuarios"]) assert.equal(claves.includes(k), false, k);
    assert.ok(claves.includes("inicio"));
  });
});
