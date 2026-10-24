/**
 * Las secciones del menú. Solo entran las que ya tienen función (PB-10): una
 * entrada que lleva a una pantalla vacía es una promesa que la app no cumple.
 * Cada módulo nuevo agrega acá su sección cuando tenga algo que mostrar.
 *
 * La maqueta (`EXPO_PUBLIC_DATOS=maqueta`) muestra el mapa completo para
 * diseñar sobre él: las secciones marcadas `soloEnMaqueta` no existen con
 * datos reales.
 *
 * Los wireframes agrupan once secciones en tres tramos, y ese es el mapa al
 * que se suma cada una (la duodécima que promete el documento no se lee en
 * ningún wireframe; no se inventa):
 *
 * - sin tramo: Inicio, Edificios, Unidades y personas
 * - Operación: Cobranza, Reservas, Incidencias, Accesos y paquetes
 * - Gestión: Finanzas, Mantenimiento, Comunicados, Reportes
 */
import { EN_MAQUETA } from "@/compartido/maqueta/modo";
import type { IconName } from "@/ui/components/icon-paths";

export type Tramo = "Operación" | "Gestión";

export interface Seccion {
  key: string;
  label: string;
  /** La ruta de expo-router a la que lleva. */
  ruta:
    | "/"
    | "/edificios"
    | "/unidades"
    | "/cobranza"
    | "/reservas"
    | "/incidencias"
    | "/accesos"
    | "/finanzas"
    | "/mantenimiento"
    | "/comunicados"
    | "/reportes";
  /** El tramo del menú; sin tramo va arriba, sin título. */
  grupo?: Tramo;
  /** El ícono del menú y de la barra del teléfono. Sin ícono, va la inicial. */
  icono?: IconName;
  /** Todavía sin función: solo se ve en la maqueta. */
  soloEnMaqueta?: boolean;
}

export const TODAS_LAS_SECCIONES: readonly Seccion[] = [
  { key: "inicio", label: "Inicio", ruta: "/", icono: "home" },
  { key: "edificios", label: "Edificios", ruta: "/edificios", icono: "building" },
  { key: "unidades", label: "Unidades y personas", ruta: "/unidades", icono: "users", soloEnMaqueta: true },
  { key: "cobranza", label: "Cobranza", ruta: "/cobranza", grupo: "Operación", icono: "receipt", soloEnMaqueta: true },
  { key: "reservas", label: "Reservas", ruta: "/reservas", grupo: "Operación", icono: "calendar-check", soloEnMaqueta: true },
  { key: "incidencias", label: "Incidencias", ruta: "/incidencias", grupo: "Operación", icono: "alert-triangle", soloEnMaqueta: true },
  { key: "accesos", label: "Accesos y paquetes", ruta: "/accesos", grupo: "Operación", icono: "door", soloEnMaqueta: true },
  { key: "finanzas", label: "Finanzas", ruta: "/finanzas", grupo: "Gestión", icono: "wallet", soloEnMaqueta: true },
  { key: "mantenimiento", label: "Mantenimiento", ruta: "/mantenimiento", grupo: "Gestión", icono: "gauge", soloEnMaqueta: true },
  { key: "comunicados", label: "Comunicados", ruta: "/comunicados", grupo: "Gestión", icono: "send", soloEnMaqueta: true },
  { key: "reportes", label: "Reportes", ruta: "/reportes", grupo: "Gestión", icono: "file-text", soloEnMaqueta: true },
];

/** Las secciones que existen en este modo. */
export function seccionesDelModo(enMaqueta: boolean, secciones: readonly Seccion[] = TODAS_LAS_SECCIONES): Seccion[] {
  return secciones.filter((s) => enMaqueta || !s.soloEnMaqueta);
}

export const SECCIONES: readonly Seccion[] = seccionesDelModo(EN_MAQUETA);

const ORDEN_DE_TRAMOS: readonly (Tramo | undefined)[] = [undefined, "Operación", "Gestión"];

/** Las secciones en el orden del menú: primero las sin tramo, después cada tramo. */
export function ordenarPorTramo<S extends Pick<Seccion, "grupo">>(secciones: readonly S[]): S[] {
  return ORDEN_DE_TRAMOS.flatMap((tramo) => secciones.filter((s) => s.grupo === tramo));
}

/** La sección que corresponde a una ruta: la de prefijo más largo. */
export function seccionDeRuta(ruta: string, secciones: readonly Seccion[] = SECCIONES): Seccion | undefined {
  return [...secciones]
    .filter((s) => ruta === s.ruta || ruta.startsWith(s.ruta === "/" ? "/" : `${s.ruta}/`))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];
}
