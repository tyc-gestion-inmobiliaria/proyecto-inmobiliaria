import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pagosFalso } from "../infrastructure/payments-fake";
import {
  aceptarPago,
  listarCola,
  nuevaClave,
  pagosDeLaUnidad,
  rechazarPago,
  registrarPago,
  reportarPago,
  revertirPago,
} from "./use-cases";

const unidades = [
  { id: "u101", orgId: "org", edificioId: "e1", edificioNombre: "Edificio 1", numero: "101" },
  { id: "u102", orgId: "org", edificioId: "e1", edificioNombre: "Edificio 1", numero: "102" },
  { id: "u201", orgId: "org", edificioId: "e2", edificioNombre: "Edificio 2", numero: "201" },
];
const cuentas = [
  { id: "c1", edificioId: "e1", nombre: "Principal", banco: "Banco", numero: "000-1" },
  { id: "c2", edificioId: "e2", nombre: "Otra", banco: "Banco", numero: "000-2" },
];
const hoy = "2026-10-24";
const datos = { monto: "150,50", fecha: "20/10/2026", cuentaId: "c1", operacion: "OP-1" };

function residente() {
  return pagosFalso({ unidades, cuentas, misUnidades: ["u101"], hoy });
}

function administrador() {
  return pagosFalso({ unidades, cuentas, administrador: true, hoy });
}

describe("reportarPago", () => {
  it("deja el pago por validar, con el monto en céntimos", async () => {
    const f = residente();
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy });
    assert.ok(r.ok);
    const pago = f.pagos.get(r.pagoId);
    assert.equal(pago?.estado, "por_validar");
    assert.equal(pago?.monto, 15050);
  });

  it("reintentar con la misma clave no duplica", async () => {
    const f = residente();
    const a = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy });
    const b = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy });
    assert.ok(a.ok && b.ok);
    assert.equal(a.pagoId, b.pagoId);
    assert.equal(f.pagos.size, 1);
  });

  it("con datos incompletos no llama a la base y marca cada campo", async () => {
    const f = residente();
    const r = await reportarPago(f.puerto, {
      orgId: "org",
      unidadId: "u101",
      datos: { monto: "", fecha: "20/10/2026", cuentaId: undefined, operacion: "" },
      clave: "k1",
      cuentas,
      hoy,
    });
    assert.ok(!r.ok && r.errores);
    assert.deepEqual(Object.keys(r.errores).sort(), ["cuenta", "monto", "operacion"]);
    assert.deepEqual(f.llamadas, []);
  });

  it("sube el comprobante con la clave del envío y lo guarda en el pago", async () => {
    const f = residente();
    const archivo = { uri: "blob:x", tipo: "image/jpeg", extension: "jpg" };
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy, archivo });
    assert.ok(r.ok);
    assert.deepEqual(f.subidas, ["org/u101/k1.jpg"]);
    assert.equal(f.pagos.get(r.pagoId)?.comprobante, "org/u101/k1.jpg");
  });

  it("si la foto no sube, no reporta", async () => {
    const f = residente();
    f.fallarLaProxima({ ok: false, fallo: "sin-conexion" });
    const archivo = { uri: "blob:x", tipo: "image/jpeg", extension: "jpg" };
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy, archivo });
    assert.ok(!r.ok && r.general);
    assert.equal(f.pagos.size, 0);
  });

  it("para una unidad que no es suya, la base lo niega y se dice", async () => {
    const f = residente();
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u102", datos, clave: "k1", cuentas, hoy });
    assert.ok(!r.ok);
    assert.equal(r.general, "Tu rol no permite hacer esto. Pídeselo a un administrador.");
  });

  it("el campo que la base rechaza vuelve marcado", async () => {
    const f = residente();
    f.fallarLaProxima({ ok: false, fallo: "invalido", campo: "fecha" });
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy });
    assert.ok(!r.ok && r.errores);
    assert.equal(r.errores.fecha, "La fecha no puede ser posterior a hoy.");
  });
});

describe("registrarPago", () => {
  it("el administrador registra sin cuenta ni operación y queda validado", async () => {
    const f = administrador();
    const r = await registrarPago(f.puerto, {
      orgId: "org",
      unidadId: "u102",
      datos: { monto: "80", fecha: "21/10/2026", cuentaId: undefined, operacion: "" },
      clave: "k2",
      cuentas,
      hoy,
    });
    assert.ok(r.ok);
    assert.equal(f.pagos.get(r.pagoId)?.estado, "aceptado");
    assert.equal(f.pagos.get(r.pagoId)?.origen, "registrado");
  });

  it("sin conexión lo dice", async () => {
    const f = administrador();
    f.fallarLaProxima({ ok: false, fallo: "sin-conexion" });
    const r = await registrarPago(f.puerto, { orgId: "org", unidadId: "u102", datos, clave: "k2", cuentas, hoy });
    assert.ok(!r.ok);
    assert.equal(r.general, "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
  });
});

describe("validar pagos", () => {
  async function conUnReporte() {
    const f = pagosFalso({ unidades, cuentas, misUnidades: ["u101"], administrador: true, hoy });
    const r = await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "k1", cuentas, hoy });
    assert.ok(r.ok);
    return { f, id: r.pagoId };
  }

  it("aceptar dos veces deja el pago aceptado sin error", async () => {
    const { f, id } = await conUnReporte();
    assert.deepEqual(await aceptarPago(f.puerto, id), { ok: true, estado: "aceptado" });
    assert.deepEqual(await aceptarPago(f.puerto, id), { ok: true, estado: "aceptado" });
  });

  it("rechazar sin motivo no llama a la base", async () => {
    const { f, id } = await conUnReporte();
    const r = await rechazarPago(f.puerto, id, "  ");
    assert.deepEqual(r, { ok: false, errorDelMotivo: "Escribe el motivo: el residente lo va a leer." });
    assert.ok(!f.llamadas.includes("rechazar"));
  });

  it("rechazar con motivo lo guarda", async () => {
    const { f, id } = await conUnReporte();
    assert.deepEqual(await rechazarPago(f.puerto, id, " No aparece en el banco "), { ok: true, estado: "rechazado" });
    assert.equal(f.pagos.get(id)?.motivoRechazo, "No aparece en el banco");
  });

  it("revertir un aceptado lo vuelve a por validar", async () => {
    const { f, id } = await conUnReporte();
    await aceptarPago(f.puerto, id);
    assert.deepEqual(await revertirPago(f.puerto, id), { ok: true, estado: "por_validar" });
    assert.equal(f.pagos.get(id)?.validadoEn, null);
  });

  it("aceptar uno rechazado avisa que cambió", async () => {
    const { f, id } = await conUnReporte();
    await rechazarPago(f.puerto, id, "No aparece");
    const r = await aceptarPago(f.puerto, id);
    assert.ok(!r.ok);
    assert.match(r.mensaje, /cambió/);
  });
});

describe("listar", () => {
  it("la cola filtra por estado y por edificio", async () => {
    const f = pagosFalso({ unidades, cuentas, misUnidades: ["u101", "u201"], hoy });
    await reportarPago(f.puerto, { orgId: "org", unidadId: "u101", datos, clave: "a", cuentas, hoy });
    await reportarPago(f.puerto, {
      orgId: "org",
      unidadId: "u201",
      datos: { ...datos, cuentaId: "c2" },
      clave: "b",
      cuentas,
      hoy,
    });
    assert.equal((await listarCola(f.puerto, "org", { edificioId: null, estado: "por_validar" })).length, 2);
    assert.deepEqual(
      (await listarCola(f.puerto, "org", { edificioId: "e2", estado: "por_validar" })).map((p) => p.unidadNumero),
      ["201"],
    );
    assert.equal((await listarCola(f.puerto, "org", { edificioId: null, estado: "aceptado" })).length, 0);
    assert.equal((await pagosDeLaUnidad(f.puerto, "org", "u101")).length, 1);
  });

  it("cada clave es nueva", () => {
    const a = nuevaClave();
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(a, nuevaClave());
  });
});
