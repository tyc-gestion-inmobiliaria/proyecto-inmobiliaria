import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Unidad } from "../dominio/unidad";
import { falloDePostgres } from "../infraestructura/fallo-de-postgres";
import { PadronFalso } from "../infraestructura/padron-falso";
import { guardarPersona } from "./guardar-persona";

const unidad = (id: string, numero: string, participacion: number | null, orgId = "a"): Unidad => ({
  id,
  orgId,
  edificioId: "e1",
  numero,
  tipo: null,
  areaM2: null,
  participacion,
});

const datos = { nombre: "Persona de prueba", documentoTipo: "dni" as const, documentoNumero: "00000001", correo: "", telefono: "" };

describe("guardarPersona", () => {
  it("no manda nada si el formulario tiene errores", async () => {
    const padron = new PadronFalso();
    const r = await guardarPersona(padron, "a", { ...datos, nombre: " " });
    assert.equal(r.ok, false);
    assert.equal(padron.personas.length, 0);
  });

  it("un documento repetido se dice junto al número de documento", async () => {
    const padron = new PadronFalso();
    await guardarPersona(padron, "a", datos);
    const r = await guardarPersona(padron, "a", { ...datos, nombre: "Otra" });
    assert.ok(!r.ok && r.fallo === "repetido" && r.errores.documentoNumero);
  });

  it("el mismo documento sí puede estar en otra administradora", async () => {
    const padron = new PadronFalso();
    await guardarPersona(padron, "a", datos);
    assert.equal((await guardarPersona(padron, "b", datos)).ok, true);
  });

  it("edita sin chocar consigo misma", async () => {
    const padron = new PadronFalso();
    const alta = await guardarPersona(padron, "a", datos);
    assert.ok(alta.ok);
    const r = await guardarPersona(padron, "a", { ...datos, correo: "nuevo@ejemplo.test" }, alta.persona.id);
    assert.ok(r.ok && r.persona.correo === "nuevo@ejemplo.test");
  });
});

describe("PadronFalso: vínculos", () => {
  async function armar() {
    const padron = new PadronFalso({ unidades: [unidad("u1", "101", 60), unidad("u2", "102", 40)] });
    const p1 = await padron.crear("a", { nombre: "Uno", documentoTipo: null, documentoNumero: null, correo: null, telefono: null });
    const p2 = await padron.crear("a", { nombre: "Dos", documentoTipo: null, documentoNumero: null, correo: null, telefono: null });
    assert.ok(p1.ok && p2.ok);
    return { padron, p1: p1.valor.id, p2: p2.valor.id };
  }

  it("una persona tiene un solo vínculo con cada unidad", async () => {
    const { padron, p1 } = await armar();
    await padron.vincular("a", { unidadId: "u1", personaId: p1, relacion: "propietario" });
    const r = await padron.vincular("a", { unidadId: "u1", personaId: p1, relacion: "residente" });
    assert.deepEqual(r, { ok: false, fallo: "repetido" });
  });

  it("no vincula a una unidad de otra administradora", async () => {
    const { padron, p1 } = await armar();
    padron.unidades.push(unidad("u9", "101", null, "b"));
    const r = await padron.vincular("a", { unidadId: "u9", personaId: p1, relacion: "inquilino" });
    assert.deepEqual(r, { ok: false, fallo: "no-existe" });
  });

  it("pasar el responsable de pago deja uno solo en la unidad", async () => {
    const { padron, p1, p2 } = await armar();
    const a = await padron.vincular("a", { unidadId: "u1", personaId: p1, relacion: "propietario" });
    const b = await padron.vincular("a", { unidadId: "u1", personaId: p2, relacion: "inquilino" });
    assert.ok(a.ok && b.ok);
    await padron.elegirResponsable("a", a.valor.id);
    await padron.elegirResponsable("a", b.valor.id);
    const responsables = (await padron.deLaUnidad("a", "u1")).filter((v) => v.responsablePago);
    assert.deepEqual(
      responsables.map((v) => v.personaId),
      [p2],
    );
  });

  it("borrar una persona borra sus vínculos", async () => {
    const { padron, p1 } = await armar();
    await padron.vincular("a", { unidadId: "u1", personaId: p1, relacion: "propietario" });
    await padron.borrar("a", p1);
    assert.deepEqual(await padron.deLaUnidad("a", "u1"), []);
  });

  it("la participación del edificio se resume igual que en la base", async () => {
    const { padron } = await armar();
    assert.equal((await padron.participacion("a", "e1")).sumaCien, true);
  });
});

describe("PadronFalso: cuentas bancarias", () => {
  it("el número de cuenta no se repite en el edificio", async () => {
    const cuentas = new PadronFalso().comoCuentas();
    const cuenta = { nombre: "Cuenta principal", banco: "Banco", numero: "000-0000001", cci: null, moneda: "PEN" as const };
    assert.equal((await cuentas.crear("a", "e1", cuenta)).ok, true);
    assert.deepEqual(await cuentas.crear("a", "e1", cuenta), { ok: false, fallo: "repetido" });
    assert.equal((await cuentas.crear("a", "e2", cuenta)).ok, true);
  });
});

describe("falloDePostgres", () => {
  it("distingue el segundo responsable de pago de un repetido cualquiera", () => {
    assert.equal(
      falloDePostgres({ code: "23505", message: 'duplicate key value violates unique constraint "unidad_persona_un_responsable_uq"' }),
      "otro-responsable",
    );
    assert.equal(falloDePostgres({ code: "23505", message: "persona_documento_uq" }), "repetido");
  });

  it("traduce permiso, clave foránea y check", () => {
    assert.equal(falloDePostgres({ code: "42501" }), "sin-permiso");
    assert.equal(falloDePostgres({ code: "23503" }), "no-existe");
    assert.equal(falloDePostgres({ code: "23514" }), "invalido");
    assert.equal(falloDePostgres({ message: "TypeError: Failed to fetch" }), "sin-conexion");
    assert.equal(falloDePostgres(null), "desconocido");
  });
});
