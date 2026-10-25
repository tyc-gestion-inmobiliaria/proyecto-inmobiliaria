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
import { EN_MAQUETA } from "@/shared/mock/mode";
import type { IconName } from "@/ui/components/icon-paths";

export type Tramo = "Operación" | "Gestión";

export interface Seccion {
  key: string;
  label: string;
  /** La ruta de expo-router a la que lleva. */
  ruta:
    | "/"
    | "/buildings"
    | "/units"
    | "/billing"
    | "/readings"
    | "/payments"
    | "/reservations"
    | "/incidents"
    | "/access"
    | "/finance"
    | "/maintenance"
    | "/announcements"
    | "/reports"
    | "/users";
  /** El tramo del menú; sin tramo va arriba, sin título. */
  grupo?: Tramo;
  /** El ícono del menú y de la barra del teléfono. Sin ícono, va la inicial. */
  icono?: IconName;
  /** Todavía sin función: solo se ve en la maqueta. */
  soloEnMaqueta?: boolean;
  /** Solo la ven estos roles; sin esto, todos. */
  soloRoles?: readonly string[];
}

/** La gestión es del equipo de la administradora; el residente ve lo suyo (su unidad, reservas, incidencias, comunicados). */
const EQUIPO = ["administrador", "personal"];

export const TODAS_LAS_SECCIONES: readonly Seccion[] = [
  { key: "inicio", label: "Inicio", ruta: "/", icono: "home" },
  { key: "edificios", label: "Edificios", ruta: "/buildings", icono: "building", soloRoles: EQUIPO },
  { key: "unidades", label: "Unidades y personas", ruta: "/units", icono: "users", soloEnMaqueta: true, soloRoles: EQUIPO },
  { key: "cobranza", label: "Cobranza", ruta: "/billing", grupo: "Operación", icono: "receipt", soloEnMaqueta: true, soloRoles: EQUIPO },
  // PB-29: el recorrido de lecturas del personal, con el teléfono en el edificio.
  { key: "lecturas", label: "Lecturas", ruta: "/readings", grupo: "Operación", icono: "droplet", soloRoles: EQUIPO },
  // La cola de pagos por validar (PB-27). En los wireframes los pagos eran el
  // último tramo de Cobranza; mientras Cobranza no los muestre, van aparte.
  { key: "pagos", label: "Pagos", ruta: "/payments", grupo: "Operación", icono: "inbox", soloRoles: EQUIPO },
  { key: "reservas", label: "Reservas", ruta: "/reservations", grupo: "Operación", icono: "calendar-check", soloEnMaqueta: true },
  { key: "incidencias", label: "Incidencias", ruta: "/incidents", grupo: "Operación", icono: "alert-triangle", soloEnMaqueta: true },
  { key: "accesos", label: "Accesos y paquetes", ruta: "/access", grupo: "Operación", icono: "door", soloEnMaqueta: true, soloRoles: EQUIPO },
  { key: "finanzas", label: "Finanzas", ruta: "/finance", grupo: "Gestión", icono: "wallet", soloEnMaqueta: true, soloRoles: EQUIPO },
  { key: "mantenimiento", label: "Mantenimiento", ruta: "/maintenance", grupo: "Gestión", icono: "gauge", soloEnMaqueta: true, soloRoles: EQUIPO },
  { key: "comunicados", label: "Comunicados", ruta: "/announcements", grupo: "Gestión", icono: "send", soloEnMaqueta: true },
  { key: "reportes", label: "Reportes", ruta: "/reports", grupo: "Gestión", icono: "file-text", soloEnMaqueta: true, soloRoles: EQUIPO },
  // PB-23: invitar y ver quién tiene acceso. Fuera de los once tramos de los
  // wireframes; va en Gestión porque es tarea de administración.
  { key: "usuarios", label: "Usuarios", ruta: "/users", grupo: "Gestión", icono: "user", soloRoles: ["administrador"] },
];

/** Las secciones que existen en este modo. */
export function seccionesDelModo(enMaqueta: boolean, secciones: readonly Seccion[] = TODAS_LAS_SECCIONES): Seccion[] {
  return secciones.filter((s) => enMaqueta || !s.soloEnMaqueta);
}

export const SECCIONES: readonly Seccion[] = seccionesDelModo(EN_MAQUETA);

/** Las secciones que ve un rol. */
export function seccionesDelRol(rol: string | undefined, secciones: readonly Seccion[] = SECCIONES): Seccion[] {
  return secciones.filter((s) => !s.soloRoles || (rol !== undefined && s.soloRoles.includes(rol)));
}

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
