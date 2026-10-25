import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nombreDeMoneda, textoDeCci, validarCuenta } from "./bank-account";
import { leerParticipacion, resumirParticipacion } from "./ownership-share";
import { validarPersona, type DatosPersona } from "./person";
import { compararNumeroDeUnidad } from "./unit";
import { nombreDeLaRelacion, responsableDePago, unidadesSinResponsable, yaVinculada, type Vinculo } from "./link";

describe("resumirParticipacion", () => {
  it("suma 100 sin errores de coma flotante", () => {
    const r = resumirParticipacion([33.3333, 33.3333, 33.3334]);
    assert.equal(r.total, 100);
    assert.equal(r.sumaCien, true);
  });

  it("0,1 + 0,2 + 99,7 es exactamente 100", () => {
    assert.equal(resumirParticipacion([0.1, 0.2, 99.7]).sumaCien, true);
  });

  it("dice cuánto falta y cuántas unidades no tienen participación", () => {
    const r = resumirParticipacion([60, null, 30]);
    assert.equal(r.diferencia, 10);
    assert.equal(r.sinParticipacion, 1);
    assert.equal(r.sumaCien, false);
  });

  it("una unidad sin participación no deja cuadrar aunque el resto sume 100", () => {
    assert.equal(resumirParticipacion([60, 40, null]).sumaCien, false);
  });

  it("si se pasa, la diferencia es negativa", () => {
    assert.equal(resumirParticipacion([60, 50]).diferencia, -10);
  });

  it("un edificio sin unidades no suma 100", () => {
    assert.equal(resumirParticipacion([]).sumaCien, false);
  });
});

describe("leerParticipacion", () => {
  it("acepta coma, punto y el signo %", () => {
    assert.deepEqual(leerParticipacion("2,5"), { ok: true, valor: 2.5 });
    assert.deepEqual(leerParticipacion(" 12.3456 % "), { ok: true, valor: 12.3456 });
  });

  it("vacío es todavía sin participación", () => {
    assert.deepEqual(leerParticipacion(""), { ok: true, valor: null });
  });

  it("rechaza más de cuatro decimales, más de 100 y lo que no es número", () => {
    assert.equal(leerParticipacion("1,23456").ok, false);
    assert.equal(leerParticipacion("100,5").ok, false);
    assert.equal(leerParticipacion("-3").ok, false);
    assert.equal(leerParticipacion("dos").ok, false);
  });
});

const vacia: DatosPersona = { nombre: "", documentoTipo: "", documentoNumero: "", correo: "", telefono: "" };

describe("validarPersona", () => {
  it("pide el nombre", () => {
    const r = validarPersona(vacia);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errores.nombre);
  });

  it("limpia lo que se escribió", () => {
    const r = validarPersona({
      nombre: "  Persona   de  prueba ",
      documentoTipo: "dni",
      documentoNumero: "00 000 001",
      correo: " Persona@Ejemplo.TEST ",
      telefono: " +51 900 000 000 ",
    });
    assert.deepEqual(r, {
      ok: true,
      persona: {
        nombre: "Persona de prueba",
        documentoTipo: "dni",
        documentoNumero: "00000001",
        correo: "persona@ejemplo.test",
        telefono: "+51 900 000 000",
      },
    });
  });

  it("el tipo y el número de documento van juntos", () => {
    const sinNumero = validarPersona({ ...vacia, nombre: "A", documentoTipo: "dni" });
    const sinTipo = validarPersona({ ...vacia, nombre: "A", documentoNumero: "00000001" });
    assert.ok(!sinNumero.ok && sinNumero.errores.documentoNumero);
    assert.ok(!sinTipo.ok && sinTipo.errores.documentoTipo);
  });

  it("comprueba el largo del DNI y del RUC", () => {
    const dni = validarPersona({ ...vacia, nombre: "A", documentoTipo: "dni", documentoNumero: "1234567" });
    const ruc = validarPersona({ ...vacia, nombre: "A", documentoTipo: "ruc", documentoNumero: "12345678901" });
    assert.equal(dni.ok, false);
    assert.equal(ruc.ok, true);
  });

  it("revisa correo y teléfono solo si se escribieron", () => {
    assert.equal(validarPersona({ ...vacia, nombre: "A" }).ok, true);
    const r = validarPersona({ ...vacia, nombre: "A", correo: "sin-arroba", telefono: "abc" });
    assert.ok(!r.ok && r.errores.correo && r.errores.telefono);
  });
});

const v = (id: string, unidadId: string, personaId: string, responsablePago = false): Vinculo => ({
  id,
  orgId: "org",
  unidadId,
  personaId,
  relacion: "propietario",
  responsablePago,
});

describe("vínculos", () => {
  const vinculos = [v("1", "u1", "p1", true), v("2", "u1", "p2"), v("3", "u2", "p2")];

  it("encuentra al responsable de pago de la unidad", () => {
    assert.equal(responsableDePago(vinculos, "u1")?.personaId, "p1");
    assert.equal(responsableDePago(vinculos, "u2"), null);
  });

  it("lista las unidades sin responsable de pago", () => {
    assert.deepEqual(unidadesSinResponsable(["u1", "u2", "u3"], vinculos), ["u2", "u3"]);
  });

  it("sabe si la persona ya está en la unidad", () => {
    assert.equal(yaVinculada(vinculos, "u1", "p2"), true);
    assert.equal(yaVinculada(vinculos, "u2", "p1"), false);
  });

  it("nombra la relación con el vocabulario del administrador", () => {
    assert.equal(nombreDeLaRelacion("inquilino"), "Inquilino");
  });
});

describe("validarCuenta", () => {
  it("acepta una cuenta con CCI y lo limpia", () => {
    const r = validarCuenta({ nombre: "Cuenta principal", banco: "Banco", numero: "000-0000001", cci: "0000 0000 0000 0000 0001", moneda: "PEN" });
    assert.ok(r.ok && r.cuenta.cci === "00000000000000000001");
  });

  it("el CCI tiene 20 dígitos y el número solo números y guiones", () => {
    const r = validarCuenta({ nombre: "Cuenta", banco: "Banco", numero: "12AB", cci: "123", moneda: "USD" });
    assert.ok(!r.ok && r.errores.cci && r.errores.numero);
  });

  it("dice cuántos dígitos del CCI lleva", () => {
    const r = validarCuenta({ nombre: "Cuenta", banco: "Banco", numero: "000-0000001", cci: "0011 0234", moneda: "PEN" });
    assert.ok(!r.ok && r.errores.cci === "El CCI tiene 20 dígitos y llevas 8");
  });

  it("avisa del número repetido en el edificio, salvo la cuenta que se edita", () => {
    const otras = [{ id: "c1", numero: "000-0000001" }];
    const d = { nombre: "Cuenta", banco: "Banco", numero: "000 - 0000001", cci: "", moneda: "PEN" as const };
    assert.ok(!validarCuenta({ ...d, numero: "000-0000001" }, otras).ok);
    assert.ok(validarCuenta({ ...d, numero: "000-0000001" }, otras, "c1").ok);
  });

  it("muestra el CCI en grupos de cuatro y nombra la moneda", () => {
    assert.equal(textoDeCci("00110234567890123456"), "0011 0234 5678 9012 3456");
    assert.equal(nombreDeMoneda("USD"), "Dólares");
  });
});

describe("compararNumeroDeUnidad", () => {
  it("ordena 2 antes que 10", () => {
    assert.deepEqual(["10", "2", "A-10", "A-2"].sort(compararNumeroDeUnidad), ["2", "10", "A-2", "A-10"]);
  });
});
