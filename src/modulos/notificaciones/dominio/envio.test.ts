import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resumenDeEnvios, type Envio } from "./envio";

const e = (id: string, estado: Envio["estado"], unidad: string): Envio => ({ id, estado, unidad, destinatario: null, correo: null, motivo: null });

describe("resumenDeEnvios", () => {
  it("cuenta los enviados y los por enviar, y deja aparte los que necesitan a alguien, por unidad", () => {
    const r = resumenDeEnvios([e("1", "enviado", "101"), e("2", "pendiente", "102"), e("3", "fallido", "1001"), e("4", "sin_correo", "201")]);
    assert.equal(r.total, 4);
    assert.equal(r.enviados, 1);
    assert.equal(r.porEnviar, 1);
    assert.deepEqual(
      r.conProblema.map((x) => x.unidad),
      ["201", "1001"],
    );
  });

  it("sin envíos, todo en cero", () => {
    assert.deepEqual(resumenDeEnvios([]), { total: 0, enviados: 0, porEnviar: 0, conProblema: [] });
  });
});
