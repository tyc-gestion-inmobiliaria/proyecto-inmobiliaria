import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { centimos, centimosDeSoles, leerCentimos, solesDe, textoDeCentimos } from "./money";
import { datosVacios, leerFecha, listaDeErrores, textoDeFecha, validarMotivo, validarPago } from "./form";
import {
  accionesDelPago,
  esEstadoDelPago,
  estadoTrasLaAccion,
  ordenarCola,
  ordenarDeLaUnidad,
  puedeGestionarPagos,
  rutaDeComprobante,
  TEXTO_DEL_ESTADO,
  type Pago,
} from "./payment";

describe("dinero en céntimos", () => {
  it("lee montos escritos de varias maneras", () => {
    assert.equal(leerCentimos("350,50"), 35050);
    assert.equal(leerCentimos("1,234.5"), 123450);
    assert.equal(leerCentimos("S/ 80"), 8000);
    assert.equal(leerCentimos("0.1"), 10);
  });

  it("rechaza lo que no es un monto", () => {
    assert.equal(leerCentimos(""), null);
    assert.equal(leerCentimos("12.345"), null);
    assert.equal(leerCentimos("-5"), null);
    assert.equal(leerCentimos("abc"), null);
    assert.equal(leerCentimos("99999999999"), null);
  });

  it("no pierde céntimos al ir y venir de la base", () => {
    assert.equal(centimosDeSoles("0.29"), 29);
    assert.equal(centimosDeSoles(1234.56), 123456);
    assert.equal(solesDe(centimos(29)), 0.29);
  });

  it("no acepta céntimos con decimales ni negativos", () => {
    assert.throws(() => centimos(1.5));
    assert.throws(() => centimos(-1));
  });

  it("escribe soles", () => {
    assert.equal(textoDeCentimos(centimos(123450)), "S/ 1,234.50");
  });
});

describe("estado del pago", () => {
  it("dice el estado con su palabra", () => {
    assert.equal(TEXTO_DEL_ESTADO.por_validar, "Por validar");
    assert.equal(TEXTO_DEL_ESTADO.aceptado, "Validado");
    assert.equal(TEXTO_DEL_ESTADO.rechazado, "Rechazado");
  });

  it("solo reconoce los tres estados", () => {
    assert.ok(esEstadoDelPago("aceptado"));
    assert.ok(!esEstadoDelPago("pagado"));
  });

  it("ofrece aceptar y rechazar al pendiente, revertir al aceptado y nada al rechazado", () => {
    assert.deepEqual(accionesDelPago("por_validar"), ["aceptar", "rechazar"]);
    assert.deepEqual(accionesDelPago("aceptado"), ["revertir"]);
    assert.deepEqual(accionesDelPago("rechazado"), []);
  });

  it("revertir vuelve a por validar", () => {
    assert.equal(estadoTrasLaAccion("revertir"), "por_validar");
    assert.equal(estadoTrasLaAccion("aceptar"), "aceptado");
  });

  it("solo el administrador gestiona pagos", () => {
    assert.ok(puedeGestionarPagos("administrador"));
    assert.ok(!puedeGestionarPagos("personal"));
    assert.ok(!puedeGestionarPagos("residente"));
  });

  it("la ruta del comprobante empieza por la administradora y la unidad", () => {
    assert.equal(rutaDeComprobante("org", "uni", "clave", ".JPG"), "org/uni/clave.jpg");
  });

  const pago = (id: string, fecha: string, reportadoEn: string) => ({ id, fecha, reportadoEn }) as Pago;

  it("la cola pone arriba el que más espera", () => {
    const cola = ordenarCola([pago("b", "2026-10-02", "2026-10-03T10:00"), pago("a", "2026-10-05", "2026-10-01T10:00")]);
    assert.deepEqual(
      cola.map((p) => p.id),
      ["a", "b"],
    );
  });

  it("los de la unidad van del más reciente al más viejo", () => {
    const lista = ordenarDeLaUnidad([pago("viejo", "2026-09-01", "x"), pago("nuevo", "2026-10-01", "x")]);
    assert.deepEqual(
      lista.map((p) => p.id),
      ["nuevo", "viejo"],
    );
  });
});

describe("formulario del pago", () => {
  const hoy = "2026-10-24";
  const cuentas = [{ id: "c1" }];

  it("arranca con la fecha de hoy", () => {
    assert.equal(datosVacios(hoy).fecha, "24/10/2026");
  });

  it("lee y escribe fechas", () => {
    assert.equal(leerFecha("5/10/2026"), "2026-10-05");
    assert.equal(leerFecha("2026-02-30"), null);
    assert.equal(textoDeFecha("2026-10-05"), "05/10/2026");
  });

  it("el reportado pide monto, fecha, cuenta y operación", () => {
    const v = validarPago({ monto: "", fecha: "", cuentaId: undefined, operacion: " " }, { origen: "reportado", hoy, cuentas });
    assert.ok(!v.ok);
    assert.deepEqual(
      listaDeErrores(v.errores).map((e) => e.campo),
      ["monto", "fecha", "cuenta", "operacion"],
    );
  });

  it("el registrado no exige cuenta ni operación", () => {
    const v = validarPago({ monto: "120", fecha: "20/10/2026", cuentaId: undefined, operacion: "" }, { origen: "registrado", hoy, cuentas });
    assert.ok(v.ok);
    assert.deepEqual(v.pago, { monto: 12000, fecha: "2026-10-20", cuentaId: null, operacion: null });
  });

  it("no acepta una fecha futura ni un monto en cero", () => {
    const v = validarPago({ monto: "0", fecha: "25/10/2026", cuentaId: "c1", operacion: "OP" }, { origen: "reportado", hoy, cuentas });
    assert.ok(!v.ok);
    assert.equal(v.errores.monto, "El monto tiene que ser mayor que cero.");
    assert.equal(v.errores.fecha, "La fecha no puede ser posterior a hoy.");
  });

  it("no acepta una cuenta que no es del edificio", () => {
    const v = validarPago({ monto: "10", fecha: "20/10/2026", cuentaId: "otra", operacion: "OP" }, { origen: "registrado", hoy, cuentas });
    assert.ok(!v.ok);
    assert.equal(v.errores.cuenta, "Elige una cuenta del edificio.");
  });

  it("recorta la operación", () => {
    const v = validarPago({ monto: "10", fecha: "20/10/2026", cuentaId: "c1", operacion: "  OP-1 " }, { origen: "reportado", hoy, cuentas });
    assert.ok(v.ok);
    assert.equal(v.pago.operacion, "OP-1");
  });

  it("el motivo del rechazo es obligatorio", () => {
    assert.deepEqual(validarMotivo("  "), { ok: false, error: "Escribe el motivo: el residente lo va a leer." });
    assert.deepEqual(validarMotivo(" No aparece en el banco "), { ok: true, motivo: "No aparece en el banco" });
    assert.ok(!validarMotivo("x".repeat(501)).ok);
  });
});
