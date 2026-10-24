import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PERSONA_NUEVA } from "../dominio/invitacion";
import { InvitacionesFalsas } from "../infraestructura/invitaciones-falso";
import { SesionFalsa } from "../infraestructura/sesion-falsa";
import { aceptar, cancelar, invitar, reenviar } from "./invitaciones";

const VOLVER = "http://localhost:8081/invitacion";
const ORG = "org-a";
const PERSONAL = { correo: "p@ejemplo.test", rol: "personal" as const, nombre: "" };

describe("invitar", () => {
  it("no llama al servidor con el formulario incompleto", async () => {
    const p = new InvitacionesFalsas();
    const r = await invitar(p, { orgId: ORG, datos: { correo: "r@ejemplo.test", rol: "residente", nombre: "" }, volverA: VOLVER });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.campos.edificio);
    assert.deepEqual(p.correos, []);
  });

  it("manda el correo con el enlace a la pantalla de aceptación", async () => {
    const p = new InvitacionesFalsas();
    const r = await invitar(p, { orgId: ORG, datos: { ...PERSONAL, correo: "P@Ejemplo.test" }, volverA: VOLVER });
    assert.equal(r.ok, true);
    assert.equal(p.correos[0].correo, "p@ejemplo.test");
    assert.match(p.correos[0].enlace, /^http:\/\/localhost:8081\/invitacion\?token=/);
  });

  it("una invitación repetida se dice junto al correo", async () => {
    const p = new InvitacionesFalsas();
    await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    const r = await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.campos.correo ?? "", /Reenvíala/);
  });

  it("un residente nuevo va con su unidad, nombre y relación", async () => {
    const p = new InvitacionesFalsas();
    const r = await invitar(p, {
      orgId: ORG,
      datos: {
        correo: "r@ejemplo.test",
        rol: "residente",
        edificioId: "e",
        unidadId: "u",
        personaId: PERSONA_NUEVA,
        nombre: "Residente",
        relacion: "inquilino",
      },
      volverA: VOLVER,
    });
    assert.equal(r.ok, true);
    assert.equal(p.invitaciones[0].unidadId, "u");
    assert.equal(p.invitaciones[0].nombre, "Residente");
  });

  it("sin permiso va arriba del botón", async () => {
    const p = new InvitacionesFalsas();
    p.falloForzado = "sin-permiso";
    const r = await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.general ?? "", /rol/);
  });
});

describe("reenviar y cancelar", () => {
  it("reenviar cambia el enlace: el anterior deja de servir", async () => {
    const p = new InvitacionesFalsas();
    await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    const viejo = p.invitaciones[0].token;
    assert.equal((await reenviar(p, { orgId: ORG, id: p.invitaciones[0].id, volverA: VOLVER })).ok, true);
    assert.equal(p.correos.length, 2);
    p.cuenta = "p@ejemplo.test";
    assert.deepEqual(await p.aceptar(viejo), { ok: false, fallo: "no_existe" });
  });

  it("una aceptada no se cancela", async () => {
    const p = new InvitacionesFalsas();
    await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    p.cuenta = "p@ejemplo.test";
    await p.aceptar(p.invitaciones[0].token);
    const r = await cancelar(p, { orgId: ORG, id: p.invitaciones[0].id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.mensaje, /aceptó/);
  });
});

describe("aceptar", () => {
  async function preparar() {
    const p = new InvitacionesFalsas();
    await invitar(p, { orgId: ORG, datos: PERSONAL, volverA: VOLVER });
    const sesion = new SesionFalsa();
    await sesion.abrirRecuperacion("token-de-acceso");
    p.cuenta = "p@ejemplo.test";
    return { p, sesion, token: p.invitaciones[0].token };
  }
  const CLAVE = { nueva: "una-clave-larga", repetida: "una-clave-larga" };

  it("la cuenta nueva acepta y fija su contraseña", async () => {
    const { p, sesion, token } = await preparar();
    const r = await aceptar(sesion, p, { token, contrasena: CLAVE });
    assert.deepEqual(r, { ok: true, orgId: ORG });
    assert.equal(sesion.contrasenaFijada, "una-clave-larga");
  });

  it("no acepta si la contraseña no coincide", async () => {
    const { p, sesion, token } = await preparar();
    const r = await aceptar(sesion, p, { token, contrasena: { nueva: "una-clave-larga", repetida: "otra" } });
    assert.equal(r.ok, false);
    assert.equal(p.invitaciones[0].usadaEn, null);
  });

  it("una vencida se explica y no fija la contraseña", async () => {
    const { p, sesion, token } = await preparar();
    p.invitaciones[0].venceEn = "2020-01-01T00:00:00Z";
    const r = await aceptar(sesion, p, { token, contrasena: CLAVE });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.general ?? "", /venció/);
      assert.equal(r.definitivo, true);
    }
    assert.equal(sesion.contrasenaFijada, null);
  });

  it("aceptar dos veces da lo mismo", async () => {
    const { p, sesion, token } = await preparar();
    await aceptar(sesion, p, { token });
    assert.deepEqual(await aceptar(sesion, p, { token }), { ok: true, orgId: ORG });
  });

  it("con otra cuenta se dice que es para otro correo", async () => {
    const { p, sesion, token } = await preparar();
    p.cuenta = "otra@ejemplo.test";
    const r = await aceptar(sesion, p, { token });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.general ?? "", /otro correo/);
  });

  it("una contraseña débil se dice junto al campo y se puede reintentar", async () => {
    const { p, sesion, token } = await preparar();
    sesion.falloDeContrasena = "debil";
    const r = await aceptar(sesion, p, { token, contrasena: CLAVE });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.campos.nueva);
      assert.equal(r.definitivo, false);
    }
    sesion.falloDeContrasena = undefined;
    const otra = await aceptar(sesion, p, { token, contrasena: { nueva: "otra-clave-larga", repetida: "otra-clave-larga" } });
    assert.equal(otra.ok, true);
  });
});
