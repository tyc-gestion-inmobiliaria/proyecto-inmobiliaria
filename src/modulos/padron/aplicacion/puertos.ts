/**
 * Lo que el padrón necesita de afuera. Supabase lo implementa en
 * `infraestructura/`; las pruebas, con un falso.
 */
export interface EdificiosPuerto {
  /** Cuántos edificios tiene registrados la administradora. */
  contar(orgId: string): Promise<number>;
}
