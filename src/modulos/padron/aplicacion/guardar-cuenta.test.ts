import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MENSAJE_CUENTA_REPETIDA, type DatosCuenta } from "../dominio/cuenta-bancaria";
import { PadronFalso } from "../infraestructura/padron-falso";
import { guardarCuenta } from "./guardar-cuenta";

const datos: DatosCuenta = { nombre: "Cuenta principal", banco: "Banco de prueba", numero: "000-0000001", cci: "", moneda: "PEN" };

describe("guardarCuenta", () => {
  it("no manda nada si el formulario tiene errores", async () => {
    const padron = new PadronFalso();
    const r = await guardarCuenta(padron.comoCuentas(), { orgId: "a", edificioId: "e1", datos: { ...datos, cci: "123" } });
    assert.ok(!r.ok && r.errores.cci);
    assert.equal(padron.cuentas.length, 0);
  });

  it("registra y después edita la misma cuenta", async () => {
    const padron = new PadronFalso();
    const cuentas = padron.comoCuentas();
    const alta = await guardarCuenta(cuentas, { orgId: "a", edificioId: "e1", datos });
    assert.ok(alta.ok);
    const edicion = await guardarCuenta(cuentas, {
      orgId: "a",
      edificioId: "e1",
      datos: { ...datos, moneda: "USD" },
      otras: padron.cuentas,
      id: alta.cuenta.id,
    });
    assert.ok(edicion.ok && edicion.cuenta.moneda === "USD");
    assert.equal(padron.cuentas.length, 1);
  });

  it("el número repetido se dice junto al campo, lo avise la pantalla o la base", async () => {
    const padron = new PadronFalso();
    const cuentas = padron.comoCuentas();
    await guardarCuenta(cuentas, { orgId: "a", edificioId: "e1", datos });
    const enPantalla = await guardarCuenta(cuentas, { orgId: "a", edificioId: "e1", datos, otras: padron.cuentas });
    assert.ok(!enPantalla.ok && enPantalla.errores.numero === MENSAJE_CUENTA_REPETIDA);
    const enLaBase = await guardarCuenta(cuentas, { orgId: "a", edificioId: "e1", datos });
    assert.ok(!enLaBase.ok && enLaBase.errores.numero === MENSAJE_CUENTA_REPETIDA && !enLaBase.general);
  });
});
