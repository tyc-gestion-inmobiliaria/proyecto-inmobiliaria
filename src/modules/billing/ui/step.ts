/** Lo que el asistente le pide a un paso abierto: guardar lo que tenga a medias. */
export interface PasoAbierto {
  /** Devuelve si quedó todo guardado. */
  guardar(): Promise<boolean>;
}
