/**
 * Las secciones del menú. Solo entran las que ya tienen función (PB-10): una
 * entrada que lleva a una pantalla vacía es una promesa que la app no cumple.
 * Cada módulo nuevo agrega acá su sección cuando tenga algo que mostrar.
 */
export interface Seccion {
  key: string;
  label: string;
  /** La ruta de expo-router a la que lleva. */
  ruta: "/";
}

export const SECCIONES: readonly Seccion[] = [{ key: "inicio", label: "Inicio", ruta: "/" }];

/** La sección que corresponde a una ruta: la de prefijo más largo. */
export function seccionDeRuta(ruta: string, secciones: readonly Seccion[] = SECCIONES): Seccion | undefined {
  return [...secciones]
    .filter((s) => ruta === s.ruta || ruta.startsWith(s.ruta === "/" ? "/" : `${s.ruta}/`))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];
}
