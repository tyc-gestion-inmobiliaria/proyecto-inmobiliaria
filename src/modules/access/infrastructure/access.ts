/**
 * La portería como la piden las rutas. Solo existe la maqueta: paquetes y
 * visitas ficticios en memoria. La versión con Supabase falta: no hay tablas
 * todavía.
 */
import { instanteDesdeHoy, numeroDeUnidad, unidadesDe } from "@/shared/mock/queries";
import { demora } from "@/shared/mock/mode";
import { mundo, nuevoId } from "@/shared/mock/world";

import type { AccesosPuerto } from "../application/ports";
import type { Paquete, Visita } from "../domain/access";

const REMITENTES = ["Reparto Rápido", "Courier Demo", "Mensajería Express", "Tienda en línea", "Farmacia del barrio"];
const VISITANTES = ["Sofía Medina", "Carlos Ríos", "Técnico de internet", "Martín Cáceres", "Gabriela Ponce", "Delivery de comida"];

const paquetes: Paquete[] = [];
const visitas: Visita[] = [];

for (const e of mundo.edificios.map((x) => x.id)) {
  const paquete = (unidad: string, dias: number, hora: string, descripcion: string | null, entregado: { hora: string; a: string } | null = null) => {
    const unidadId = `${e}-u${unidad}`;
    paquetes.push({
      id: `paq-${paquetes.length + 1}`,
      edificioId: e,
      unidadId,
      unidadNumero: numeroDeUnidad(unidadId),
      remitente: REMITENTES[paquetes.length % REMITENTES.length],
      descripcion,
      recibidoEn: instanteDesdeHoy(-dias, hora),
      entregadoEn: entregado ? instanteDesdeHoy(0, entregado.hora) : null,
      entregadoA: entregado?.a ?? null,
    });
  };
  paquete("103", 5, "16:20", "Caja grande");
  paquete("201", 2, "11:05", "Sobre");
  paquete("302", 1, "18:40", null);
  paquete("101", 0, "09:15", "Caja mediana");
  paquete("202", 0, "10:30", "Bolsa");
  paquete("301", 1, "15:00", "Caja chica", { hora: "08:10", a: "Titular de la unidad" });

  const visita = (unidad: string, dias: number, entrada: string, salida: string | null, documento: string | null = null) => {
    const unidadId = `${e}-u${unidad}`;
    visitas.push({
      id: `vis-${visitas.length + 1}`,
      edificioId: e,
      unidadId,
      unidadNumero: numeroDeUnidad(unidadId),
      visitante: VISITANTES[visitas.length % VISITANTES.length],
      documento,
      entrada: instanteDesdeHoy(-dias, entrada),
      salida: salida ? instanteDesdeHoy(-dias, salida) : null,
    });
  };
  visita("102", 0, "08:40", null, "DNI 40001234");
  visita("203", 0, "09:55", "10:40");
  visita("301", 0, "11:20", null);
  visita("101", 1, "17:00", "19:30");
}

function ahora(): string {
  return new Date().toISOString();
}

export const accesosMaqueta: AccesosPuerto = {
  paquetes(edificioId) {
    return demora(paquetes.filter((p) => p.edificioId === edificioId).map((p) => ({ ...p })));
  },

  visitas(edificioId) {
    return demora(visitas.filter((v) => v.edificioId === edificioId).map((v) => ({ ...v })));
  },

  unidades(edificioId) {
    return demora(unidadesDe(edificioId));
  },

  recibirPaquete(nuevo) {
    const p: Paquete = { id: nuevoId("paq"), ...nuevo, unidadNumero: numeroDeUnidad(nuevo.unidadId), recibidoEn: ahora(), entregadoEn: null, entregadoA: null };
    paquetes.push(p);
    return demora({ ok: true as const, valor: { ...p } });
  },

  entregarPaquete(id, entregadoA) {
    const p = paquetes.find((x) => x.id === id);
    if (!p) return demora({ ok: false as const, mensaje: "El paquete ya no existe." });
    if (p.entregadoEn) return demora({ ok: false as const, mensaje: `Ese paquete ya se entregó a ${p.entregadoA}.` });
    p.entregadoEn = ahora();
    p.entregadoA = entregadoA;
    return demora({ ok: true as const, valor: { ...p } });
  },

  registrarVisita(nueva) {
    const v: Visita = { id: nuevoId("vis"), ...nueva, unidadNumero: numeroDeUnidad(nueva.unidadId), entrada: ahora(), salida: null };
    visitas.push(v);
    return demora({ ok: true as const, valor: { ...v } });
  },

  marcarSalida(id) {
    const v = visitas.find((x) => x.id === id);
    if (!v) return demora({ ok: false as const, mensaje: "La visita ya no existe." });
    if (v.salida) return demora({ ok: false as const, mensaje: "Esa visita ya tiene su salida." });
    v.salida = ahora();
    return demora({ ok: true as const, valor: { ...v } });
  },
};

export const accesosAdaptador: AccesosPuerto = accesosMaqueta;
