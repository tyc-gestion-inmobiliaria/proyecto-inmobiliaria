import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { avisoDeParticipacion, participacionConEsta, resumirParticipacion, textoDePorcentaje } from "./participacion";
import { datosDePersona } from "./persona";
import {
  datosDeUnidad,
  leerArea,
  listaDeErroresUnidad,
  MENSAJE_NUMERO_REPETIDO,
  ordenarUnidades,
  puedeEditarPadron,
  textoDeArea,
  validarUnidad,
  type DatosUnidad,
} from "./unidad";

const vacia: DatosUnidad = { numero: "", tipo: "", area: "", participacion: "" };
const otras = [
  { id: "u1", numero: "101" },
  { id: "u2", numero: "A-2" },
];

describe("validarUnidad", () => {
  it("pide el número y deja lo demás opcional", () => {
    const r = validarUnidad(vacia);
    assert.ok(!r.ok && r.errores.numero && Object.keys(r.errores).length === 1);
    assert.deepEqual(validarUnidad({ ...vacia, numero: " 101 " }, []), {
      ok: true,
      unidad: { numero: "101", tipo: null, areaM2: null, participacion: null },
    });
  });

  it("limpia y convierte lo que se escribió", () => {
    const r = validarUnidad({ numero: " 302 ", tipo: "  Departamento  dúplex ", area: "85,5 m²", participacion: "2,5 %" });
    assert.deepEqual(r, { ok: true, unidad: { numero: "302", tipo: "Departamento dúplex", areaM2: 85.5, participacion: 2.5 } });
  });

  it("avisa del número repetido aunque cambien mayúsculas y espacios", () => {
    const r = validarUnidad({ ...vacia, numero: " a-2" }, otras);
    assert.ok(!r.ok && r.errores.numero === MENSAJE_NUMERO_REPETIDO);
  });

  it("al editar, la unidad no choca consigo misma", () => {
    assert.equal(validarUnidad({ ...vacia, numero: "101" }, otras, "u1").ok, true);
    assert.equal(validarUnidad({ ...vacia, numero: "101" }, otras, "u2").ok, false);
  });

  it("revisa largos, área y participación, todo a la vez", () => {
    const r = validarUnidad({ numero: "x".repeat(21), tipo: "t".repeat(41), area: "-3", participacion: "100,5" });
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(Object.keys(r.errores).sort(), ["area", "numero", "participacion", "tipo"]);
  });
});

describe("leerArea", () => {
  it("acepta coma, punto y la unidad al final", () => {
    assert.deepEqual(leerArea("72,25"), { ok: true, valor: 72.25 });
    assert.deepEqual(leerArea(" 120 m2 "), { ok: true, valor: 120 });
    assert.deepEqual(leerArea(""), { ok: true, valor: null });
  });

  it("rechaza cero, más de dos decimales, lo enorme y lo que no es número", () => {
    assert.equal(leerArea("0").ok, false);
    assert.equal(leerArea("10,555").ok, false);
    assert.equal(leerArea("123456789").ok, false);
    assert.equal(leerArea("cien").ok, false);
  });
});

describe("listaDeErroresUnidad", () => {
  it("sigue el orden del formulario con la etiqueta de cada campo", () => {
    assert.deepEqual(
      listaDeErroresUnidad({ participacion: "p", numero: "n" }).map((e) => e.etiqueta),
      ["Número", "Participación"],
    );
  });
});

describe("ordenarUnidades", () => {
  it("ordena el número en orden natural", () => {
    assert.deepEqual(
      ordenarUnidades([{ numero: "10" }, { numero: "2" }, { numero: "B-1" }, { numero: "1" }]).map((u) => u.numero),
      ["1", "2", "10", "B-1"],
    );
  });
});

describe("datosDeUnidad y datosDePersona", () => {
  it("llenan el formulario con lo guardado, o vacío", () => {
    assert.deepEqual(datosDeUnidad(), vacia);
    const u = { id: "u", orgId: "o", edificioId: "e", numero: "1", tipo: null, areaM2: 50, participacion: 1.25 };
    assert.deepEqual(datosDeUnidad(u), { numero: "1", tipo: "", area: "50", participacion: "1.25" });
    assert.equal(datosDePersona().nombre, "");
  });

  it("lo que se llena vuelve a pasar la validación igual", () => {
    const u = { id: "u", orgId: "o", edificioId: "e", numero: "1", tipo: "Local", areaM2: 50.5, participacion: 1.2345 };
    const r = validarUnidad(datosDeUnidad(u), [u], "u");
    assert.deepEqual(r, { ok: true, unidad: { numero: "1", tipo: "Local", areaM2: 50.5, participacion: 1.2345 } });
  });
});

describe("avisoDeParticipacion", () => {
  it("no dice nada si suma 100 o si no hay unidades", () => {
    assert.equal(avisoDeParticipacion(resumirParticipacion([60, 40])), null);
    assert.equal(avisoDeParticipacion(resumirParticipacion([])), null);
  });

  it("dice cuánto falta y cuántas unidades no tienen participación", () => {
    assert.equal(
      avisoDeParticipacion(resumirParticipacion([60, 37.5, null, null])),
      `Faltan ${textoDePorcentaje(2.5)} para llegar a 100 %. 2 unidades no tienen participación.`,
    );
  });

  it("dice cuánto se pasa", () => {
    assert.equal(avisoDeParticipacion(resumirParticipacion([60, 50])), `Se pasa de 100 % por ${textoDePorcentaje(10)}.`);
  });

  it("si ninguna tiene participación, lo dice sin contar lo que falta", () => {
    assert.equal(avisoDeParticipacion(resumirParticipacion([null, null, null])), "Ninguna unidad tiene participación.");
    assert.equal(avisoDeParticipacion(resumirParticipacion([null])), "La unidad no tiene participación.");
  });

  it("con 100 pero una unidad sin participación, avisa solo de esa", () => {
    assert.equal(avisoDeParticipacion(resumirParticipacion([60, 40, null])), "1 unidad no tiene participación.");
  });
});

describe("participacionConEsta", () => {
  const unidades = [
    { id: "u1", participacion: 60 },
    { id: "u2", participacion: 30 },
  ];

  it("suma las demás más la que se escribe", () => {
    assert.equal(participacionConEsta(unidades, 10).sumaCien, true);
  });

  it("al editar, reemplaza la participación vieja de esa unidad", () => {
    assert.equal(participacionConEsta(unidades, 40, "u2").sumaCien, true);
    assert.equal(participacionConEsta(unidades, 40, "u2").unidades, 2);
  });
});

describe("textoDeArea y textoDePorcentaje", () => {
  it("sin área, una raya; con ella, los m²", () => {
    assert.equal(textoDeArea(null), "—");
    assert.match(textoDeArea(85.5), /m²$/);
    assert.match(textoDePorcentaje(12.3456), /%$/);
  });
});

describe("puedeEditarPadron", () => {
  it("solo el administrador, como en la RLS", () => {
    assert.equal(puedeEditarPadron("administrador"), true);
    assert.equal(puedeEditarPadron("personal"), false);
    assert.equal(puedeEditarPadron("residente"), false);
  });
});
