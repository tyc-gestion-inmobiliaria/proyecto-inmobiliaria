import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SesionFalsa } from "../infraestructura/sesion-falsa";
import { iniciarSesion } from "./iniciar-sesion";

describe("iniciarSesion", () => {
  it("no llama a Auth si el formulario está incompleto", async () => {
    const sesion = new SesionFalsa();
    const r = await iniciarSesion(sesion, { correo: "", contrasena: "" });
    assert.equal(r.ok, false);
    assert.equal(sesion.intentos, 0);
  });

  it("entra con credenciales válidas y normaliza el correo", async () => {
    const sesion = new SesionFalsa({ correo: "persona@ejemplo.com", contrasena: "secreta" });
    const r = await iniciarSesion(sesion, { correo: " Persona@Ejemplo.com ", contrasena: "secreta" });
    assert.equal(r.ok, true);
    assert.equal((await sesion.cuentaActual())?.correo, "persona@ejemplo.com");
  });

  it("con credenciales malas no dice si el correo existe", async () => {
    const sesion = new SesionFalsa({ correo: "persona@ejemplo.com", contrasena: "secreta" });
    const conCorreoMalo = await iniciarSesion(sesion, { correo: "otra@ejemplo.com", contrasena: "secreta" });
    const conClaveMala = await iniciarSesion(sesion, { correo: "persona@ejemplo.com", contrasena: "otra" });
    assert.deepEqual(conCorreoMalo, conClaveMala);
    assert.equal(conCorreoMalo.ok, false);
    if (!conCorreoMalo.ok) assert.ok(conCorreoMalo.campos.contrasena);
  });

  it("un fallo de red va como mensaje general, no en un campo", async () => {
    const sesion = new SesionFalsa(undefined, "sin-conexion");
    const r = await iniciarSesion(sesion, { correo: "a@b.co", contrasena: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.deepEqual(r.campos, {});
      assert.match(r.general ?? "", /conexión/);
    }
  });
});
