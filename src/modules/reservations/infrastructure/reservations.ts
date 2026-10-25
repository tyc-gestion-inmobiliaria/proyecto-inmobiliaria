/**
 * Las reservas como las piden las rutas. Solo existe la maqueta: áreas y
 * reservas ficticias en memoria. La versión con Supabase falta: no hay
 * tablas `area_comun` ni `reserva` todavía.
 *
 * "Al día" sale de la deuda vencida de la semilla (`deudaVencidaDe`), como
 * lo haría una vista de cobranza y pagos.
 */
import { hoyEnLima } from "@/shared/format";
import { deudaVencidaDe, fechaDesdeHoy, numeroDeUnidad, unidadesDe } from "@/shared/mock/queries";
import { demora } from "@/shared/mock/mode";
import { mundo, nuevoId } from "@/shared/mock/world";

import type { ReservasPuerto } from "../application/ports";
import { puedeCambiar, TEXTO_DEL_ESTADO, validarReserva, type AreaComun, type Reserva, type Turno } from "../domain/reservation";

const AREAS_TIPO = [
  { clave: "salon", nombre: "Salón de usos múltiples", aforo: 40 },
  { clave: "parrilla", nombre: "Zona de parrillas", aforo: 15 },
  { clave: "terraza", nombre: "Terraza", aforo: 20 },
];

const areas: AreaComun[] = mundo.edificios.flatMap((e, i) =>
  // Torre del Parque no tiene parrillas: no todos los edificios tienen lo mismo.
  AREAS_TIPO.filter((a) => !(i === 2 && a.clave === "parrilla")).map((a) => ({ id: `${e.id}-${a.clave}`, edificioId: e.id, nombre: a.nombre, aforo: a.aforo })),
);

function semilla(): Reserva[] {
  const lista: Reserva[] = [];
  const agregar = (edificioId: string, area: string, unidad: string, dias: number, turno: Turno, estado: Reserva["estado"]) => {
    const unidadId = `${edificioId}-u${unidad}`;
    lista.push({ id: `res-${lista.length + 1}`, edificioId, areaId: `${edificioId}-${area}`, unidadId, unidadNumero: numeroDeUnidad(unidadId), fecha: fechaDesdeHoy(dias), turno, estado });
  };
  for (const e of mundo.edificios.map((x) => x.id)) {
    agregar(e, "salon", "102", 0, "noche", "confirmada");
    agregar(e, "terraza", "301", 1, "tarde", "pendiente");
    agregar(e, "salon", "203", 2, "noche", "pendiente");
    agregar(e, "terraza", "101", 3, "manana", "confirmada");
    agregar(e, "salon", "302", 5, "tarde", "cancelada");
    agregar(e, "salon", "103", 6, "noche", "confirmada");
    agregar(e, "terraza", "202", 9, "noche", "pendiente");
    agregar(e, "salon", "301", -4, "noche", "confirmada");
    if (e !== "ed-parque") agregar(e, "parrilla", "202", 2, "tarde", "confirmada");
  }
  return lista;
}

const reservas = semilla();

function unidadesConDeuda(edificioId: string) {
  const hoy = hoyEnLima();
  return unidadesDe(edificioId).map((u) => ({ ...u, alDia: deudaVencidaDe(u.id, hoy) === 0 }));
}

export const reservasMaqueta: ReservasPuerto = {
  areas(edificioId) {
    return demora(areas.filter((a) => a.edificioId === edificioId));
  },

  delEdificio(edificioId) {
    return demora(reservas.filter((r) => r.edificioId === edificioId).map((r) => ({ ...r })));
  },

  unidades(edificioId) {
    return demora(unidadesConDeuda(edificioId));
  },

  reservar(nueva) {
    // Lo que haría la función de la base: vuelve a validar todo, la deuda incluida.
    const errores = validarReserva(nueva, {
      hoy: hoyEnLima(),
      reservas: reservas.filter((r) => r.edificioId === nueva.edificioId),
      unidades: unidadesConDeuda(nueva.edificioId),
    });
    const primero = Object.values(errores)[0];
    if (primero) return demora({ ok: false as const, mensaje: primero });
    const r: Reserva = { id: nuevoId("res"), ...nueva, unidadNumero: numeroDeUnidad(nueva.unidadId), estado: "pendiente" };
    reservas.push(r);
    return demora({ ok: true as const, valor: { ...r } });
  },

  cambiarEstado(id, estado) {
    const r = reservas.find((x) => x.id === id);
    if (!r) return demora({ ok: false as const, mensaje: "La reserva ya no existe." });
    if (!puedeCambiar(r.estado, estado)) return demora({ ok: false as const, mensaje: `La reserva ya está ${TEXTO_DEL_ESTADO[r.estado].toLowerCase()}.` });
    r.estado = estado;
    return demora({ ok: true as const, valor: { ...r } });
  },
};

export const reservasAdaptador: ReservasPuerto = reservasMaqueta;
