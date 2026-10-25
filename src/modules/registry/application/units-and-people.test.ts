import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DatosPersona } from "../domain/person";
import type { Unidad } from "../domain/unit";
import { PadronFalso } from "../infrastructure/registry-fake";
import { guardarUnidad } from "./save-unit";
import { agregarPersonaALaUnidad, editarPersonaDeLaUnidad, MENSAJE_SIN_RELACION, MENSAJE_YA_ESTA } from "./unit-people";
import type { VinculosPuerto } from "./ports";

const ORG = "a";
const datos = { numero: "101", tipo: "Departamento", area: "80", participacion: "50" };

describe("guardarUnidad", () => {
  it("con errores no escribe nada", async () => {
    const padron = new PadronFalso();
    const r = await guardarUnidad(padron.comoUnidades(), { orgId: ORG, edificioId: "e1", datos: { ...datos, numero: "" } });
    assert.ok(!r.ok && r.errores.numero);
    assert.equal(padron.unidades.length, 0);
  });

  it("da de alta en el edificio y la lista sale en orden natural", async () => {
    const unidades = new PadronFalso().comoUnidades();
    await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos: { ...datos, numero: "10" } });
    await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos: { ...datos, numero: "2" } });
    assert.deepEqual(
      (await unidades.delEdificio(ORG, "e1")).map((u) => u.numero),
      ["2", "10"],
    );
    assert.equal((await unidades.participacion(ORG, "e1")).sumaCien, true);
  });

  it("el número repetido que rechaza la base cae en el campo Número", async () => {
    const unidades = new PadronFalso().comoUnidades();
    await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos });
    // Sin pasarle `otras`, el aviso tiene que venir de la base.
    const r = await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos });
    assert.ok(!r.ok && r.errores.numero && !r.general);
  });

  it("el mismo número sí puede estar en otro edificio", async () => {
    const unidades = new PadronFalso().comoUnidades();
    await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos });
    assert.equal((await guardarUnidad(unidades, { orgId: ORG, edificioId: "e2", datos })).ok, true);
  });

  it("edita la que se le indica", async () => {
    const unidades = new PadronFalso().comoUnidades();
    const alta = await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", datos });
    assert.ok(alta.ok);
    const r = await guardarUnidad(unidades, {
      orgId: ORG,
      edificioId: "e1",
      id: alta.unidad.id,
      datos: { ...datos, participacion: "" },
      otras: await unidades.delEdificio(ORG, "e1"),
    });
    assert.ok(r.ok && r.unidad.participacion === null);
  });

  it("lo que no es de un campo va como mensaje general", async () => {
    const unidades = new PadronFalso().comoUnidades();
    const r = await guardarUnidad(unidades, { orgId: ORG, edificioId: "e1", id: "no-hay", datos });
    assert.ok(!r.ok && r.general && Object.keys(r.errores).length === 0);
  });
});

const unidad = (id: string): Unidad => ({ id, orgId: ORG, edificioId: "e1", numero: id, tipo: null, areaM2: null, participacion: null });
const nueva: DatosPersona = { nombre: "Persona de prueba", documentoTipo: "", documentoNumero: "", correo: "", telefono: "" };

function armar() {
  const padron = new PadronFalso({ unidades: [unidad("u1"), unidad("u2")] });
  return { padron, puertos: { personas: padron, vinculos: padron } };
}

const alta = {
  orgId: ORG,
  unidadId: "u1",
  quien: { modo: "nueva", datos: nueva },
  relacion: "propietario",
  responsable: false,
  vinculosDeLaUnidad: [],
} as const;

describe("agregarPersonaALaUnidad", () => {
  it("pide la relación y no registra a nadie sin ella", async () => {
    const { padron, puertos } = armar();
    const r = await agregarPersonaALaUnidad(puertos, { ...alta, relacion: undefined });
    assert.ok(!r.ok && r.errores.relacion === MENSAJE_SIN_RELACION);
    assert.equal(padron.personas.length, 0);
  });

  it("junta los errores de la persona con los del vínculo", async () => {
    const { puertos } = armar();
    const r = await agregarPersonaALaUnidad(puertos, { ...alta, quien: { modo: "nueva", datos: { ...nueva, nombre: "" } }, relacion: undefined });
    assert.ok(!r.ok && r.errores.nombre && r.errores.relacion);
  });

  it("registra a la persona nueva, la vincula y la marca como responsable de pago", async () => {
    const { padron, puertos } = armar();
    const r = await agregarPersonaALaUnidad(puertos, { ...alta, responsable: true });
    assert.ok(r.ok && r.vinculo.responsablePago && r.vinculo.relacion === "propietario");
    assert.equal(padron.personas.length, 1);
    assert.equal((await padron.deLaUnidad(ORG, "u1"))[0].responsablePago, true);
  });

  it("marcar a otra persona pasa la responsabilidad de pago: queda una sola", async () => {
    const { padron, puertos } = armar();
    await agregarPersonaALaUnidad(puertos, { ...alta, responsable: true });
    await agregarPersonaALaUnidad(puertos, {
      ...alta,
      quien: { modo: "nueva", datos: { ...nueva, nombre: "Otra" } },
      relacion: "inquilino",
      responsable: true,
    });
    const responsables = (await padron.deLaUnidad(ORG, "u1")).filter((v) => v.responsablePago);
    assert.equal(responsables.length, 1);
    assert.equal(responsables[0].relacion, "inquilino");
  });

  it("agrega a alguien ya registrado a otra unidad sin duplicarlo", async () => {
    const { padron, puertos } = armar();
    const primera = await agregarPersonaALaUnidad(puertos, alta);
    assert.ok(primera.ok);
    const r = await agregarPersonaALaUnidad(puertos, {
      ...alta,
      unidadId: "u2",
      quien: { modo: "existente", personaId: primera.vinculo.personaId },
      relacion: "residente",
    });
    assert.ok(r.ok);
    assert.equal(padron.personas.length, 1);
    assert.equal((await padron.deLaPersona(ORG, primera.vinculo.personaId)).length, 2);
  });

  it("avisa si la persona ya está en la unidad, antes y después de ir a la base", async () => {
    const { puertos } = armar();
    const primera = await agregarPersonaALaUnidad(puertos, alta);
    assert.ok(primera.ok);
    const quien = { modo: "existente", personaId: primera.vinculo.personaId } as const;
    const antes = await agregarPersonaALaUnidad(puertos, { ...alta, quien, relacion: "inquilino", vinculosDeLaUnidad: [primera.vinculo] });
    assert.ok(!antes.ok && antes.errores.personaId === MENSAJE_YA_ESTA);
    const despues = await agregarPersonaALaUnidad(puertos, { ...alta, quien, relacion: "inquilino" });
    assert.ok(!despues.ok && despues.errores.personaId === MENSAJE_YA_ESTA);
  });

  it("pide elegir a la persona ya registrada", async () => {
    const { puertos } = armar();
    const r = await agregarPersonaALaUnidad(puertos, { ...alta, quien: { modo: "existente", personaId: "" } });
    assert.ok(!r.ok && r.errores.personaId);
  });

  it("si la persona se registró pero el vínculo falló, la devuelve para no registrarla dos veces", async () => {
    const { padron } = armar();
    const vinculos: VinculosPuerto = {
      deLaUnidad: (o, u) => padron.deLaUnidad(o, u),
      deLaPersona: (o, p) => padron.deLaPersona(o, p),
      cambiarRelacion: (o, i, r) => padron.cambiarRelacion(o, i, r),
      elegirResponsable: (o, i) => padron.elegirResponsable(o, i),
      desvincular: (o, i) => padron.desvincular(o, i),
      vincular: async () => ({ ok: false, fallo: "sin-conexion" }),
    };
    const r = await agregarPersonaALaUnidad({ personas: padron, vinculos }, alta);
    assert.ok(!r.ok && r.persona && r.general);
    assert.equal(padron.personas.length, 1);
  });
});

describe("editarPersonaDeLaUnidad", () => {
  async function conUno() {
    const { padron, puertos } = armar();
    const r = await agregarPersonaALaUnidad(puertos, alta);
    assert.ok(r.ok);
    return { padron, puertos, vinculo: r.vinculo };
  }

  it("cambia los datos, la relación y la marca de responsable de pago", async () => {
    const { padron, puertos, vinculo } = await conUno();
    const r = await editarPersonaDeLaUnidad(puertos, {
      orgId: ORG,
      vinculo,
      datos: { ...nueva, correo: "nuevo@ejemplo.test" },
      relacion: "inquilino",
      responsable: true,
    });
    assert.ok(r.ok && r.vinculo.relacion === "inquilino" && r.vinculo.responsablePago);
    assert.equal(padron.personas[0].correo, "nuevo@ejemplo.test");
  });

  it("con un dato mal no toca nada", async () => {
    const { padron, puertos, vinculo } = await conUno();
    const r = await editarPersonaDeLaUnidad(puertos, {
      orgId: ORG,
      vinculo,
      datos: { ...nueva, correo: "sin-arroba" },
      relacion: "inquilino",
      responsable: false,
    });
    assert.ok(!r.ok && r.errores.correo);
    assert.equal(padron.vinculos[0].relacion, "propietario");
  });
});
