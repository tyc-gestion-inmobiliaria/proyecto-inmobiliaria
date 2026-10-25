import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EdificiosFalso } from "../infrastructure/buildings-fake";
import { guardarEdificio } from "./save-building";

const ORG_A = "org-a";
const ORG_B = "org-b";

describe("guardarEdificio", () => {
  it("con errores no escribe nada", async () => {
    const puerto = new EdificiosFalso();
    const r = await guardarEdificio(puerto, { orgId: ORG_A, datos: { nombre: "", direccion: "" } });
    assert.equal(r.ok, false);
    assert.equal(puerto.escrituras, 0);
  });

  it("da de alta limpio y el edificio aparece en la lista de su administradora", async () => {
    const puerto = new EdificiosFalso();
    const r = await guardarEdificio(puerto, { orgId: ORG_A, datos: { nombre: "  Torre  Luna ", direccion: " " } });
    assert.equal(r.ok, true);
    const lista = await puerto.listar(ORG_A);
    assert.deepEqual(
      lista.map((e) => [e.nombre, e.direccion]),
      [["Torre Luna", null]],
    );
    assert.deepEqual(await puerto.listar(ORG_B), []);
  });

  it("edita el que se le indica", async () => {
    const puerto = new EdificiosFalso([{ id: "e1", orgId: ORG_A, nombre: "Torre Sol", direccion: null }]);
    const r = await guardarEdificio(puerto, {
      orgId: ORG_A,
      id: "e1",
      datos: { nombre: "Torre Sol", direccion: "Calle Uno 100" },
      existentes: await puerto.listar(ORG_A),
    });
    assert.equal(r.ok, true);
    assert.equal((await puerto.listar(ORG_A))[0].direccion, "Calle Uno 100");
  });

  it("el nombre repetido que rechaza la base va junto al campo Nombre", async () => {
    // Sin `existentes`, la validación local no lo ve: lo rechaza el puerto.
    const puerto = new EdificiosFalso([{ id: "e1", orgId: ORG_A, nombre: "Torre Sol", direccion: null }]);
    const r = await guardarEdificio(puerto, { orgId: ORG_A, datos: { nombre: "Torre Sol", direccion: "" } });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.campos.nombre ?? "", /Ya hay un edificio/);
      assert.equal(r.general, undefined);
    }
  });

  it("el mismo nombre en otra administradora no choca", async () => {
    const puerto = new EdificiosFalso([{ id: "e1", orgId: ORG_B, nombre: "Torre Sol", direccion: null }]);
    const r = await guardarEdificio(puerto, { orgId: ORG_A, datos: { nombre: "Torre Sol", direccion: "" } });
    assert.equal(r.ok, true);
  });

  it("un fallo que no es de un campo va como mensaje general", async () => {
    const casos = [
      ["sin-conexion", /conexión/],
      ["sin-permiso", /administrador/],
      ["no-existe", /ya no está/],
    ] as const;
    for (const [fallo, texto] of casos) {
      const r = await guardarEdificio(new EdificiosFalso([], fallo), { orgId: ORG_A, datos: { nombre: "X", direccion: "" } });
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.deepEqual(r.campos, {});
        assert.match(r.general ?? "", texto);
      }
    }
  });

  it("editar uno que no existe dice que ya no está", async () => {
    const r = await guardarEdificio(new EdificiosFalso(), { orgId: ORG_A, id: "nada", datos: { nombre: "X", direccion: "" } });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.general ?? "", /ya no está/);
  });
});
