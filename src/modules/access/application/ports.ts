/**
 * Lo que la portería necesita de afuera. Hoy solo lo implementa la maqueta;
 * la versión con Supabase falta (no hay tablas `paquete` ni `visita`).
 */
import type { Paquete, Visita } from "../domain/access";

export interface UnidadCorta {
  id: string;
  numero: string;
}

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export interface AccesosPuerto {
  paquetes(edificioId: string): Promise<Paquete[]>;
  visitas(edificioId: string): Promise<Visita[]>;
  unidades(edificioId: string): Promise<UnidadCorta[]>;
  recibirPaquete(nuevo: { edificioId: string; unidadId: string; remitente: string; descripcion: string | null }): Promise<Resultado<Paquete>>;
  entregarPaquete(id: string, entregadoA: string): Promise<Resultado<Paquete>>;
  registrarVisita(nueva: { edificioId: string; unidadId: string; visitante: string; documento: string | null }): Promise<Resultado<Visita>>;
  marcarSalida(id: string): Promise<Resultado<Visita>>;
}
