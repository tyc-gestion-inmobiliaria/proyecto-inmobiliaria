import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hayErrores, normalizarCorreo, validarCredenciales } from "./credentials";

describe("validarCredenciales", () => {
  it("pide correo y contraseña cuando faltan", () => {
    const e = validarCredenciales({ correo: "  ", contrasena: "" });
    assert.ok(e.correo);
    assert.ok(e.contrasena);
    assert.equal(hayErrores(e), true);
  });

  it("rechaza un correo sin dominio", () => {
    const e = validarCredenciales({ correo: "persona@", contrasena: "x" });
    assert.match(e.correo ?? "", /nombre@empresa/);
    assert.equal(e.contrasena, undefined);
  });

  it("acepta un correo con espacios alrededor", () => {
    assert.equal(hayErrores(validarCredenciales({ correo: " persona@ejemplo.com ", contrasena: "x" })), false);
  });

  it("no juzga la contraseña: eso lo decide Auth", () => {
    assert.equal(hayErrores(validarCredenciales({ correo: "a@b.co", contrasena: "1" })), false);
  });
});

describe("normalizarCorreo", () => {
  it("recorta y pasa a minúsculas", () => {
    assert.equal(normalizarCorreo("  Persona@Ejemplo.COM "), "persona@ejemplo.com");
  });
});
