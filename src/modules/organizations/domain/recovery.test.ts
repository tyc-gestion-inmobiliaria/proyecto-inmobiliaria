import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { leerEnlaceDeRecuperacion, validarCorreo, validarNuevaContrasena } from "./recovery";

describe("validarCorreo", () => {
  it("pide el correo y su forma", () => {
    assert.ok(validarCorreo(" "));
    assert.match(validarCorreo("persona@") ?? "", /nombre@empresa/);
    assert.equal(validarCorreo(" Persona@Ejemplo.com "), undefined);
  });
});

describe("validarNuevaContrasena", () => {
  it("pide el largo mínimo", () => {
    assert.match(validarNuevaContrasena({ nueva: "corta", repetida: "corta" }).nueva ?? "", /10/);
  });

  it("avisa junto a la repetición si no coincide", () => {
    const e = validarNuevaContrasena({ nueva: "una-clave-larga", repetida: "otra-clave-larga" });
    assert.equal(e.nueva, undefined);
    assert.ok(e.repetida);
  });

  it("acepta dos iguales y largas", () => {
    assert.deepEqual(validarNuevaContrasena({ nueva: "una-clave-larga", repetida: "una-clave-larga" }), {});
  });
});

describe("leerEnlaceDeRecuperacion", () => {
  it("lee los tokens del fragmento", () => {
    const r = leerEnlaceDeRecuperacion("http://localhost:8081/#access_token=a&refresh_token=b&type=recovery&expires_in=3600");
    assert.deepEqual(r, { tipo: "recuperacion", tokenDeAcceso: "a", tokenDeRenovacion: "b" });
  });

  it("lee el esquema de la app", () => {
    const r = leerEnlaceDeRecuperacion("proyectoinmobiliaria://#access_token=a&refresh_token=b&type=recovery");
    assert.equal(r?.tipo, "recuperacion");
  });

  it("un enlace vencido se reconoce", () => {
    const r = leerEnlaceDeRecuperacion("http://localhost:8081/#error=access_denied&error_code=otp_expired");
    assert.deepEqual(r, { tipo: "vencido" });
  });

  it("un enlace de otro tipo no es de recuperación", () => {
    assert.equal(leerEnlaceDeRecuperacion("http://localhost:8081/#access_token=a&refresh_token=b&type=signup"), null);
    assert.equal(leerEnlaceDeRecuperacion("http://localhost:8081/"), null);
    assert.equal(leerEnlaceDeRecuperacion(null), null);
  });
});
