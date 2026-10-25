/**
 * Las incidencias como las piden las rutas. Solo existe la maqueta: datos en
 * memoria, ficticios, que vuelven a empezar al recargar. La versión con
 * Supabase falta: no hay tabla `incidencia` todavía. Cuando la haya, este
 * archivo elige entre las dos con `EN_MAQUETA`, como los demás módulos.
 */
import { hoyEnLima } from "@/shared/format";
import { fechaDesdeHoy, numeroDeUnidad, unidadesDe } from "@/shared/mock/queries";
import { demora } from "@/shared/mock/mode";
import { nuevoId } from "@/shared/mock/world";

import type { IncidenciasPuerto } from "../application/ports";
import { puedeCambiar, TEXTO_DEL_ESTADO, type Incidencia, type Prioridad } from "../domain/incident";

function semilla(): Incidencia[] {
  const lista: Incidencia[] = [];
  const agregar = (edificioId: string, unidad: string | null, titulo: string, prioridad: Prioridad, estado: Incidencia["estado"], hace: number, detalle: string | null = null) => {
    const unidadId = unidad ? `${edificioId}-u${unidad}` : null;
    lista.push({
      id: `inc-${lista.length + 1}`,
      edificioId,
      unidadId,
      unidadNumero: unidadId ? numeroDeUnidad(unidadId) : null,
      titulo,
      detalle,
      prioridad,
      estado,
      reportadaEl: fechaDesdeHoy(-hace),
      actualizadaEl: fechaDesdeHoy(-Math.max(0, hace - 1)),
    });
  };
  for (const e of ["ed-olivos", "ed-acacias", "ed-parque"]) {
    agregar(e, "302", "Filtración en el techo del baño", "alta", "abierta", 1, "Gotea cuando se usa la ducha del piso de arriba.");
    agregar(e, null, "Luz del pasillo del 2.º piso apagada", "media", "abierta", 3);
    agregar(e, null, "Puerta de la cochera se traba al cerrar", "alta", "en_curso", 5, "El técnico viene el jueves.");
    agregar(e, "101", "Intercomunicador sin audio", "baja", "abierta", 8);
    agregar(e, null, "Mancha de humedad en la escalera", "baja", "en_curso", 12);
    agregar(e, "201", "Caño de la cocina con fuga", "media", "resuelta", 6);
    agregar(e, null, "Bomba de agua hacía ruido", "alta", "resuelta", 15);
  }
  return lista;
}

const incidencias = semilla();

export const incidenciasMaqueta: IncidenciasPuerto = {
  delEdificio(edificioId) {
    return demora(incidencias.filter((i) => i.edificioId === edificioId).map((i) => ({ ...i })));
  },

  unidades(edificioId) {
    return demora(unidadesDe(edificioId));
  },

  registrar(nueva) {
    const hoy = hoyEnLima();
    const i: Incidencia = {
      id: nuevoId("inc"),
      edificioId: nueva.edificioId,
      unidadId: nueva.unidadId,
      unidadNumero: nueva.unidadId ? numeroDeUnidad(nueva.unidadId) : null,
      titulo: nueva.titulo,
      detalle: nueva.detalle,
      prioridad: nueva.prioridad,
      estado: "abierta",
      reportadaEl: hoy,
      actualizadaEl: hoy,
    };
    incidencias.push(i);
    return demora({ ok: true as const, valor: { ...i } });
  },

  cambiarEstado(id, estado) {
    const i = incidencias.find((x) => x.id === id);
    if (!i) return demora({ ok: false as const, mensaje: "La incidencia ya no existe." });
    // Lo que haría la función de la base: valida el estado anterior.
    if (!puedeCambiar(i.estado, estado)) {
      return demora({ ok: false as const, mensaje: `La incidencia ya está ${TEXTO_DEL_ESTADO[i.estado].toLowerCase()}.` });
    }
    i.estado = estado;
    i.actualizadaEl = hoyEnLima();
    return demora({ ok: true as const, valor: { ...i } });
  },
};

export const incidenciasAdaptador: IncidenciasPuerto = incidenciasMaqueta;
