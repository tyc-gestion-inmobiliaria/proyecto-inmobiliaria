/**
 * Las secciones del menú. Solo entran las que ya tienen función (PB-10): una
 * entrada que lleva a una pantalla vacía es una promesa que la app no cumple.
 * Cada módulo nuevo agrega acá su sección cuando tenga algo que mostrar.
 *
 * Los wireframes agrupan once secciones en tres tramos, y ese es el mapa al
 * que se suma cada una (la duodécima que promete el documento no se lee en
 * ningún wireframe; no se inventa):
 *
 * - sin tramo: Inicio, Edificios, Unidades y personas
 * - Operación: Cobranza, Reservas, Incidencias, Accesos y paquetes
 * - Gestión: Finanzas, Mantenimiento, Comunicados, Reportes
 */
import type { IconName } from "@/ui/components/icon-paths";

export type Tramo = "Operación" | "Gestión";

export interface Seccion {
  key: string;
  label: string;
  /** La ruta de expo-router a la que lleva. */
  ruta: "/" | "/edificios";
  /** El tramo del menú; sin tramo va arriba, sin título. */
  grupo?: Tramo;
  /** El ícono del menú y de la barra del teléfono. Sin ícono, va la inicial. */
  icono?: IconName;
}

export const SECCIONES: readonly Seccion[] = [
  { key: "inicio", label: "Inicio", ruta: "/", icono: "home" },
  { key: "edificios", label: "Edificios", ruta: "/edificios", icono: "building" },
];

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
