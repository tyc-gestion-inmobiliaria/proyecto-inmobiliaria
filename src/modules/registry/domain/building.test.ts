import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claveDeNombre,
  hayErrores,
  limpiarEdificio,
  listaDeErrores,
  ordenarEdificios,
  puedeEditarEdificios,
  validarEdificio,
} from "./building";

const otros = [
  { id: "e1", nombre: "Torre Sol" },
  { id: "e2", nombre: "Residencial Norte" },
];

describe("validarEdificio", () => {
  it("pide el nombre cuando falta o es solo espacios", () => {
    const e = validarEdificio({ nombre: "   ", direccion: "" });
    assert.match(e.nombre ?? "", /nombre/);
    assert.equal(hayErrores(e), true);
  });

  it("la dirección es opcional", () => {
    assert.equal(hayErrores(validarEdificio({ nombre: "Torre Luna", direccion: "  " })), false);
  });

  it("rechaza un nombre de más de 200 caracteres y dice cuántos tiene", () => {
    const e = validarEdificio({ nombre: "a".repeat(201), direccion: "" });
    assert.match(e.nombre ?? "", /201/);
    assert.equal(hayErrores(validarEdificio({ nombre: "a".repeat(200), direccion: "" })), false);
  });

  it("rechaza una dirección de más de 300 caracteres", () => {
    const e = validarEdificio({ nombre: "Torre Luna", direccion: "b".repeat(301) });
    assert.ok(e.direccion);
    assert.equal(e.nombre, undefined);
  });

  it("el largo se cuenta después de quitar los espacios sobrantes", () => {
    assert.equal(hayErrores(validarEdificio({ nombre: `  ${"a".repeat(200)}  `, direccion: "" })), false);
  });

  it("avisa del nombre repetido aunque cambien mayúsculas y espacios", () => {
    const e = validarEdificio({ nombre: "  torre   SOL ", direccion: "" }, otros);
    assert.match(e.nombre ?? "", /Ya hay un edificio/);
  });

  it("al editar, el edificio no choca consigo mismo", () => {
    assert.equal(hayErrores(validarEdificio({ nombre: "Torre Sol", direccion: "" }, otros, "e1")), false);
    assert.equal(hayErrores(validarEdificio({ nombre: "Torre Sol", direccion: "" }, otros, "e2")), true);
  });

  it("junta los errores de los dos campos a la vez", () => {
    const e = validarEdificio({ nombre: "", direccion: "x".repeat(301) });
    assert.deepEqual(Object.keys(e).sort(), ["direccion", "nombre"]);
  });
});

describe("limpiarEdificio", () => {
  it("recorta, junta espacios y deja la dirección vacía en null", () => {
    assert.deepEqual(limpiarEdificio({ nombre: "  Torre   Luna ", direccion: "   " }), { nombre: "Torre Luna", direccion: null });
    assert.deepEqual(limpiarEdificio({ nombre: "A", direccion: " Av.  Uno 1 " }), { nombre: "A", direccion: "Av. Uno 1" });
  });
});

describe("listaDeErrores", () => {
  it("sigue el orden del formulario y lleva la etiqueta del campo", () => {
    const l = listaDeErrores({ direccion: "d", nombre: "n" });
    assert.deepEqual(
      l.map((x) => [x.campo, x.etiqueta]),
      [
        ["nombre", "Nombre"],
        ["direccion", "Dirección"],
      ],
    );
  });

  it("sin errores, vacía", () => {
    assert.deepEqual(listaDeErrores({}), []);
  });
});

describe("claveDeNombre y ordenarEdificios", () => {
  it("compara sin mayúsculas ni espacios de más", () => {
    assert.equal(claveDeNombre(" Torre  Sol "), claveDeNombre("torre sol"));
  });

  it("ordena por nombre, con los números en orden natural", () => {
    const r = ordenarEdificios([{ nombre: "Torre 10" }, { nombre: "álamo" }, { nombre: "Torre 2" }]);
    assert.deepEqual(
      r.map((x) => x.nombre),
      ["álamo", "Torre 2", "Torre 10"],
    );
  });
});

describe("puedeEditarEdificios", () => {
  it("solo el administrador, como en la RLS", () => {
    assert.equal(puedeEditarEdificios("administrador"), true);
    assert.equal(puedeEditarEdificios("personal"), false);
    assert.equal(puedeEditarEdificios("residente"), false);
  });
});
