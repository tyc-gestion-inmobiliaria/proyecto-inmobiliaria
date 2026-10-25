import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  esEnlaceDeInvitacion,
  estadoDeInvitacion,
  leerEnlaceDeInvitacion,
  limpiarInvitacion,
  listaDeErrores,
  mensajeDeRechazo,
  nombreDelEstado,
  ordenarInvitaciones,
  PERSONA_NUEVA,
  puedeInvitar,
  validarInvitacion,
  type Invitacion,
} from "./invitation";
import { ordenarMiembros } from "./membership";

const AHORA = new Date("2026-10-24T12:00:00Z");

function inv(extra: Partial<Invitacion> = {}): Invitacion {
  return {
    id: "i",
    correo: "persona@ejemplo.test",
    rol: "personal",
    unidadId: null,
    personaId: null,
    nombre: null,
    venceEn: "2026-10-30T12:00:00Z",
    usadaEn: null,
    canceladaEn: null,
    creadoEn: "2026-10-23T12:00:00Z",
    ...extra,
  };
}

describe("estadoDeInvitacion", () => {
  it("abierta y en plazo: Pendiente", () => {
    assert.equal(nombreDelEstado(estadoDeInvitacion(inv(), AHORA)), "Pendiente");
  });
  it("pasado el plazo: Vencida", () => {
    assert.equal(estadoDeInvitacion(inv({ venceEn: "2026-10-24T11:59:59Z" }), AHORA), "vencida");
  });
  it("usada, aunque ya haya vencido: Aceptada", () => {
    assert.equal(
      estadoDeInvitacion(inv({ usadaEn: "2026-10-24T00:00:00Z", venceEn: "2026-10-01T00:00:00Z" }), AHORA),
      "aceptada",
    );
  });
  it("cancelada: Cancelada", () => {
    assert.equal(estadoDeInvitacion(inv({ canceladaEn: "2026-10-24T00:00:00Z" }), AHORA), "cancelada");
  });
});

describe("ordenarInvitaciones", () => {
  it("pone primero lo que espera algo y después lo cerrado, lo reciente arriba", () => {
    const lista = [
      inv({ id: "aceptada", usadaEn: "2026-10-23T00:00:00Z" }),
      inv({ id: "vieja", creadoEn: "2026-10-20T00:00:00Z" }),
      inv({ id: "vencida", venceEn: "2026-10-01T00:00:00Z" }),
      inv({ id: "nueva", creadoEn: "2026-10-24T00:00:00Z" }),
    ];
    assert.deepEqual(
      ordenarInvitaciones(lista, AHORA).map((i) => i.id),
      ["nueva", "vieja", "vencida", "aceptada"],
    );
  });
});

describe("validarInvitacion", () => {
  it("pide correo y rol", () => {
    const e = validarInvitacion({ correo: "", nombre: "" });
    assert.deepEqual(Object.keys(e).sort(), ["correo", "rol"]);
  });

  it("el personal no pide unidad", () => {
    assert.deepEqual(validarInvitacion({ correo: "p@ejemplo.test", rol: "personal", nombre: "" }), {});
  });

  it("el residente pide edificio, luego unidad, luego quién es", () => {
    const base = { correo: "r@ejemplo.test", rol: "residente" as const, nombre: "" };
    assert.ok(validarInvitacion(base).edificio);
    assert.ok(validarInvitacion({ ...base, edificioId: "e" }).unidad);
    assert.ok(validarInvitacion({ ...base, edificioId: "e", unidadId: "u" }).persona);
  });

  it("una persona nueva pide nombre y relación", () => {
    const e = validarInvitacion({
      correo: "r@ejemplo.test",
      rol: "residente",
      edificioId: "e",
      unidadId: "u",
      personaId: PERSONA_NUEVA,
      nombre: " ",
    });
    assert.deepEqual(
      listaDeErrores(e).map((x) => x.campo),
      ["nombre", "relacion"],
    );
  });
});

describe("limpiarInvitacion", () => {
  it("normaliza el correo y deja fuera lo del residente si no lo es", () => {
    assert.deepEqual(
      limpiarInvitacion({ correo: " Persona@Ejemplo.TEST ", rol: "personal", edificioId: "e", unidadId: "u", nombre: "x" }),
      { correo: "persona@ejemplo.test", rol: "personal" },
    );
  });

  it("el residente con su ficha del padrón", () => {
    assert.deepEqual(
      limpiarInvitacion({ correo: "r@ejemplo.test", rol: "residente", edificioId: "e", unidadId: "u", personaId: "p", nombre: "" }),
      { correo: "r@ejemplo.test", rol: "residente", unidadId: "u", personaId: "p" },
    );
  });

  it("el residente nuevo, con nombre y relación", () => {
    assert.deepEqual(
      limpiarInvitacion({
        correo: "r@ejemplo.test",
        rol: "residente",
        edificioId: "e",
        unidadId: "u",
        personaId: PERSONA_NUEVA,
        nombre: "  Nombre Apellido ",
        relacion: "inquilino",
      }),
      { correo: "r@ejemplo.test", rol: "residente", unidadId: "u", nombre: "Nombre Apellido", relacion: "inquilino" },
    );
  });

  it("con errores no devuelve nada", () => {
    assert.equal(limpiarInvitacion({ correo: "r@", rol: "personal", nombre: "" }), null);
  });
});

describe("leerEnlaceDeInvitacion", () => {
  it("la cuenta nueva trae el token y la sesión de la invitación", () => {
    const e = leerEnlaceDeInvitacion(
      "http://localhost:8081/invitation?token=abc#access_token=at&refresh_token=rt&expires_in=3600&type=invite",
    );
    assert.deepEqual(e, {
      token: "abc",
      sesion: { tokenDeAcceso: "at", tokenDeRenovacion: "rt", cuentaNueva: true },
      vencido: false,
    });
  });

  it("la cuenta que ya existía llega con un enlace mágico", () => {
    const e = leerEnlaceDeInvitacion("http://localhost:8081/invitation?token=abc#access_token=at&refresh_token=rt&type=magiclink");
    assert.equal(e.sesion?.cuentaNueva, false);
  });

  it("un enlace vencido o usado vuelve con error y sin sesión", () => {
    const e = leerEnlaceDeInvitacion(
      "http://localhost:8081/invitation?token=abc#error=access_denied&error_code=otp_expired&error_description=x",
    );
    assert.deepEqual(e, { token: "abc", sesion: null, vencido: true });
  });

  it("sin dirección no hay nada", () => {
    assert.deepEqual(leerEnlaceDeInvitacion(null), { token: null, sesion: null, vencido: false });
  });
});

describe("esEnlaceDeInvitacion", () => {
  it("reconoce la ruta con o sin dominio y en el teléfono", () => {
    assert.ok(esEnlaceDeInvitacion("http://localhost:8081/invitation?token=a#type=invite"));
    assert.ok(esEnlaceDeInvitacion("proyectoinmobiliaria://invitation?token=a"));
    assert.ok(esEnlaceDeInvitacion("/invitation"));
  });
  it("no confunde otras rutas", () => {
    assert.equal(esEnlaceDeInvitacion("http://localhost:8081/#access_token=a&type=recovery"), false);
    assert.equal(esEnlaceDeInvitacion("http://localhost:8081/invitationes"), false);
  });
});

describe("permisos y palabras", () => {
  it("solo el administrador invita", () => {
    assert.equal(puedeInvitar("administrador"), true);
    assert.equal(puedeInvitar("personal"), false);
    assert.equal(puedeInvitar("residente"), false);
  });
  it("cada rechazo dice qué hacer", () => {
    assert.match(mensajeDeRechazo("vencida"), /venció.*otra/);
    assert.match(mensajeDeRechazo("usada"), /ya se usó/);
  });
  it("los miembros activos van primero, por rol", () => {
    const m = ordenarMiembros([
      { usuarioId: "1", correo: "b@x.test", rol: "residente", activa: true },
      { usuarioId: "2", correo: "a@x.test", rol: "administrador", activa: false },
      { usuarioId: "3", correo: "c@x.test", rol: "administrador", activa: true },
    ]);
    assert.deepEqual(
      m.map((x) => x.usuarioId),
      ["3", "1", "2"],
    );
  });
});
