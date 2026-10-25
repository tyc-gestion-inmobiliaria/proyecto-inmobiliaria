import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { esRol, nombreDelRol, organizacionEnCurso, type Membresia } from "./membership";

const b: Membresia = { orgId: "b", orgNombre: "Beta", rol: "personal" };
const a: Membresia = { orgId: "a", orgNombre: "Alfa", rol: "administrador" };

describe("organizacionEnCurso", () => {
  it("sin membresías no hay organización", () => {
    assert.equal(organizacionEnCurso([]), null);
  });

  it("respeta la elegida si sigue siendo suya", () => {
    assert.equal(organizacionEnCurso([a, b], "b"), b);
  });

  it("si la elegida ya no es suya, toma la primera por nombre", () => {
    assert.equal(organizacionEnCurso([b, a], "zzz"), a);
  });
});

describe("roles", () => {
  it("reconoce solo los roles conocidos", () => {
    assert.equal(esRol("administrador"), true);
    assert.equal(esRol("supervisor"), false);
    assert.equal(esRol(null), false);
  });

  it("nombra el rol para la pantalla", () => {
    assert.equal(nombreDelRol("residente"), "Residente");
  });
});
