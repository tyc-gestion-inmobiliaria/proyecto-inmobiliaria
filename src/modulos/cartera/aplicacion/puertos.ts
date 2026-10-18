/**
 * Lo que el inicio necesita de afuera para resumir un edificio. La cartera
 * entera la cuenta el padrón (`EdificiosPuerto`).
 */
export interface UnidadesPuerto {
  /** Cuántas unidades tiene registradas un edificio de la administradora. */
  contarDelEdificio(orgId: string, edificioId: string): Promise<number>;
}
