/**
 * Los casos de uso del cierre: abrirlo, guardar una lectura, guardar el
 * presupuesto, emitir y armar el estado de cuenta. Validan antes de mandar y
 * traducen el rechazo de la base a algo que la pantalla sabe decir.
 */
import { avisoDeLectura, leerMedida } from "../dominio/lectura";
import { leerPartidas, type ErroresDePartida, type FilaDePartida } from "../dominio/presupuesto";
import { estadoDeLaUnidad, type Recibo } from "../dominio/recibo";
import type { CobranzaPuerto, FalloDeCobranza, Resultado } from "./puertos";

const MENSAJE: Record<FalloDeCobranza, string> = {
  "sin-permiso": "Tu rol no permite hacer este cambio. Pídeselo a un administrador.",
  "no-existe": "El cierre ya no está. Vuelve al edificio y ábrelo otra vez.",
  invalido: "Algún dato no se aceptó. Revisa lo marcado e inténtalo de nuevo.",
  participacion: "Las participaciones del edificio no suman 100 %. Corrígelas en el padrón.",
  "sin-cuenta": "El edificio no tiene cuenta bancaria. Regístrala antes de emitir.",
  "ya-emitido": "Este cierre ya se emitió y no se puede cambiar.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo guardar. Inténtalo de nuevo en un momento.",
};

export function mensajeDeCobranza(fallo: FalloDeCobranza): string {
  return MENSAJE[fallo];
}

export type ResultadoDeLectura = { ok: true } | { ok: false; error: string };

/** Guarda una fila de lecturas tal como se escribió. El error vuelve para mostrarlo en la fila. */
export async function guardarLectura(
  puerto: CobranzaPuerto,
  orgId: string,
  lecturaId: string,
  texto: { anterior: string; actual: string },
): Promise<ResultadoDeLectura> {
  const anterior = leerMedida(texto.anterior);
  const actual = leerMedida(texto.actual);
  const aviso = avisoDeLectura(anterior, actual);
  if (aviso?.bloquea) return { ok: false, error: aviso.texto };
  const r = await puerto.guardarLectura(orgId, lecturaId, {
    anterior: anterior as number | null,
    actual: actual as number | null,
  });
  return r.ok ? { ok: true } : { ok: false, error: mensajeDeCobranza(r.fallo) };
}

export type ResultadoDePresupuesto =
  | { ok: true }
  | { ok: false; errores: Record<string, ErroresDePartida>; general?: undefined }
  | { ok: false; errores?: undefined; general: string };

export async function guardarPresupuesto(
  puerto: CobranzaPuerto,
  orgId: string,
  cierreId: string,
  filas: readonly FilaDePartida[],
): Promise<ResultadoDePresupuesto> {
  const v = leerPartidas(filas);
  if (!v.ok) return { ok: false, errores: v.errores };
  const r = await puerto.guardarPartidas(orgId, cierreId, v.partidas);
  return r.ok ? { ok: true } : { ok: false, general: mensajeDeCobranza(r.fallo) };
}

export type ResultadoDeEmision = { ok: true; recibos: number } | { ok: false; mensaje: string };

/** Emite. Si el botón se pulsa dos veces, la base devuelve lo ya emitido sin duplicar. */
export async function emitirCierre(puerto: CobranzaPuerto, cierreId: string, vence: string | null): Promise<ResultadoDeEmision> {
  if (!vence) return { ok: false, mensaje: "Elige una fecha de vencimiento válida, como 15/10/2026." };
  const r = await puerto.emitir(cierreId, vence);
  return r.ok ? { ok: true, recibos: r.valor } : { ok: false, mensaje: mensajeDeCobranza(r.fallo) };
}

/** Abre el cierre del periodo (o el existente) y devuelve su id. */
export async function abrirCierre(puerto: CobranzaPuerto, edificioId: string, periodo: string): Promise<Resultado<string>> {
  return puerto.abrirCierre(edificioId, periodo);
}

export interface EstadoDeCuenta {
  recibos: Recibo[];
  saldo: number;
  porValidar: number;
  estado: ReturnType<typeof estadoDeLaUnidad>;
}

export async function estadoDeCuenta(puerto: CobranzaPuerto, orgId: string, unidadId: string, hoy: string): Promise<EstadoDeCuenta> {
  const [recibos, { saldo, porValidar }] = await Promise.all([puerto.recibosDeLaUnidad(orgId, unidadId), puerto.saldoDeLaUnidad(orgId, unidadId)]);
  return { recibos, saldo, porValidar, estado: estadoDeLaUnidad(recibos, saldo, hoy) };
}
