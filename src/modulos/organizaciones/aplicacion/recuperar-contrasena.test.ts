import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SesionFalsa } from "../infraestructura/sesion-falsa";
import { fijarContrasena, pedirRecuperacion } from "./recuperar-contrasena";

const VOLVER = "http://localhost:8081/";

describe("pedirRecuperacion", () => {
  it("no llama a Auth con un correo mal escrito", async () => {
    const sesion = new SesionFalsa();
    const r = await pedirRecuperacion(sesion, "persona@", VOLVER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.correo);
    assert.deepEqual(sesion.recuperaciones, []);
  });

  it("pide el correo con el correo normalizado", async () => {
    const sesion = new SesionFalsa();
    const r = await pedirRecuperacion(sesion, " Persona@Ejemplo.com ", VOLVER);
    assert.equal(r.ok, true);
    assert.deepEqual(sesion.recuperaciones, ["persona@ejemplo.com"]);
  });

  it("contesta lo mismo exista o no la cuenta", async () => {
    const sesion = new SesionFalsa({ correo: "persona@ejemplo.com", contrasena: "x" });
    const existe = await pedirRecuperacion(sesion, "persona@ejemplo.com", VOLVER);
    const noExiste = await pedirRecuperacion(sesion, "nadie@ejemplo.com", VOLVER);
    assert.deepEqual(existe, noExiste);
  });

  it("demasiados pedidos van como mensaje general", async () => {
    const sesion = new SesionFalsa();
    sesion.falloDeRecuperacion = "demasiados-pedidos";
    const r = await pedirRecuperacion(sesion, "persona@ejemplo.com", VOLVER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.general ?? "", /minuto/);
  });
});

describe("fijarContrasena", () => {
  it("no llama a Auth si no coinciden", async () => {
    const sesion = new SesionFalsa();
    await sesion.abrirRecuperacion("token");
    const r = await fijarContrasena(sesion, { nueva: "una-clave-larga", repetida: "otra" });
    assert.equal(r.ok, false);
    assert.equal(sesion.contrasenaFijada, null);
  });

  it("fija la nueva con la sesión de recuperación", async () => {
    const sesion = new SesionFalsa();
    await sesion.abrirRecuperacion("token");
    const r = await fijarContrasena(sesion, { nueva: "una-clave-larga", repetida: "una-clave-larga" });
    assert.equal(r.ok, true);
    assert.equal(sesion.contrasenaFijada, "una-clave-larga");
  });

  it("una contraseña débil se dice junto al campo", async () => {
    const sesion = new SesionFalsa();
    sesion.falloDeContrasena = "debil";
    await sesion.abrirRecuperacion("token");
    const r = await fijarContrasena(sesion, { nueva: "una-clave-larga", repetida: "una-clave-larga" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.campos.nueva);
  });

  it("sin sesión de recuperación pide otro enlace", async () => {
    const sesion = new SesionFalsa();
    const r = await fijarContrasena(sesion, { nueva: "una-clave-larga", repetida: "una-clave-larga" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.general ?? "", /enlace/);
  });
});
