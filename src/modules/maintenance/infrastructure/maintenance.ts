/**
 * El mantenimiento como lo piden las rutas. Solo existe la maqueta: equipos,
 * proveedores y tareas ficticios en memoria. La versión con Supabase falta:
 * no hay tablas todavía.
 */
import { hoyEnLima } from "@/shared/format";
import { fechaDesdeHoy } from "@/shared/mock/queries";
import { demora } from "@/shared/mock/mode";
import { mundo } from "@/shared/mock/world";

import type { MantenimientoPuerto } from "../application/ports";
import { marcarHecha, sumarMeses, type Equipo, type Proveedor, type TareaDeMantenimiento } from "../domain/maintenance";

const proveedores: Proveedor[] = [
  { id: "prov-ascensores", nombre: "Elevadores Demo", rubro: "Ascensores", telefono: "01 555 0101" },
  { id: "prov-bombas", nombre: "Hidráulica Demo", rubro: "Bombas y tanques", telefono: "01 555 0102" },
  { id: "prov-incendio", nombre: "Protección Demo", rubro: "Seguridad contra incendios", telefono: "01 555 0103" },
  { id: "prov-electrico", nombre: "Electricidad Demo", rubro: "Tableros y grupo electrógeno", telefono: null },
];

const equipos: Equipo[] = [];
const tareas: TareaDeMantenimiento[] = [];

for (const e of mundo.edificios) {
  const equipo = (clave: string, nombre: string, ubicacion: string, proveedorId: string | null) => {
    const id = `${e.id}-${clave}`;
    equipos.push({ id, edificioId: e.id, nombre, ubicacion, proveedorId });
    return id;
  };
  const tarea = (equipoId: string, texto: string, frecuenciaMeses: number, proximaEnDias: number) => {
    const proxima = fechaDesdeHoy(proximaEnDias);
    tareas.push({ id: `tar-${tareas.length + 1}`, edificioId: e.id, equipoId, tarea: texto, frecuenciaMeses, ultima: sumarMeses(proxima, -frecuenciaMeses), proxima });
  };
  const ascensor = equipo("ascensor", "Ascensor", "Hall principal", "prov-ascensores");
  const bomba = equipo("bomba", "Bomba de agua", "Cuarto de bombas", "prov-bombas");
  const cisterna = equipo("cisterna", "Cisterna y tanque elevado", "Sótano y azotea", "prov-bombas");
  const extintores = equipo("extintores", "Extintores", "Todos los pisos", "prov-incendio");
  const tablero = equipo("tablero", "Tablero eléctrico general", "Cuarto de medidores", "prov-electrico");
  tarea(ascensor, "Mantenimiento preventivo", 1, -3);
  tarea(bomba, "Revisión y engrase", 3, 6);
  tarea(cisterna, "Limpieza y desinfección", 6, -12);
  tarea(extintores, "Recarga y prueba", 12, 40);
  tarea(tablero, "Ajuste de borneras y termografía", 6, 13);
  tarea(ascensor, "Inspección anual", 12, 95);
}

export const mantenimientoMaqueta: MantenimientoPuerto = {
  delEdificio(edificioId) {
    const propios = equipos.filter((q) => q.edificioId === edificioId);
    const ids = new Set(propios.map((q) => q.proveedorId));
    return demora({
      equipos: propios.map((q) => ({ ...q })),
      proveedores: proveedores.filter((p) => ids.has(p.id)),
      tareas: tareas.filter((t) => t.edificioId === edificioId).map((t) => ({ ...t })),
    });
  },

  marcarHecha(tareaId) {
    const i = tareas.findIndex((t) => t.id === tareaId);
    if (i < 0) return demora({ ok: false as const, mensaje: "La tarea ya no existe." });
    const hoy = hoyEnLima();
    // Idempotente ante el doble toque: si ya se hizo hoy, no se corre otra vez la fecha.
    if (tareas[i].ultima === hoy) return demora({ ok: true as const, valor: { ...tareas[i] } });
    tareas[i] = marcarHecha(tareas[i], hoy);
    return demora({ ok: true as const, valor: { ...tareas[i] } });
  },
};

export const mantenimientoAdaptador: MantenimientoPuerto = mantenimientoMaqueta;
