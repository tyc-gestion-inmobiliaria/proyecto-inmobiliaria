/**
 * Lo que los pagos necesitan de afuera. Supabase lo implementa en
 * `infraestructura/`; las pruebas, con el falso.
 *
 * Leer rechaza si no se pudo (decir "no hay pagos" cuando no se pudo leer
 * sería mentir). Escribir no rechaza: devuelve el fallo en una categoría que
 * la pantalla sabe decir y, si la base lo marcó, el campo culpable.
 *
 * Las otras ramas usan este puerto así: el portal del residente llama a
 * `reportar` (por el caso de uso `reportarPago`) y lee `deLaUnidad`; las
 * notificaciones y la auditoría leen las tablas `pago` y `pago_aplicacion`.
 */
import type { CampoDelPago, PagoNuevo } from "../dominio/formulario";
import type { EstadoDelPago, Pago } from "../dominio/pago";

export type FalloDePago =
  | "sin-permiso"
  | "no-existe"
  /** Un dato que la base no aceptó; `campo` dice cuál. */
  | "invalido"
  /** La transición no vale desde el estado en que está el pago. */
  | "estado"
  | "sin-conexion"
  | "sin-configurar"
  | "desconocido";

export type CampoRechazado = CampoDelPago | "motivo" | "comprobante" | "clave";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; fallo: FalloDePago; campo?: CampoRechazado };

export interface CuentaDestino {
  id: string;
  nombre: string;
  banco: string;
  numero: string;
}

export interface FiltroDeLaCola {
  /** `null`: toda la cartera. */
  edificioId: string | null;
  estado: EstadoDelPago;
}

/** El pago como se manda: lo validado más la unidad, la clave del envío y el comprobante. */
export interface EnvioDePago extends PagoNuevo {
  unidadId: string;
  /** La genera el cliente una vez por formulario: el reintento manda la misma. */
  clave: string;
  comprobante: string | null;
}

/** La foto como la entrega el selector: una URI (nativo) o un blob: (web). */
export interface ArchivoDeComprobante {
  uri: string;
  tipo: string;
  extension: string;
}

export interface PagosPuerto {
  cola(orgId: string, filtro: FiltroDeLaCola): Promise<Pago[]>;
  deLaUnidad(orgId: string, unidadId: string): Promise<Pago[]>;
  /** Las cuentas del edificio donde se puede depositar. */
  cuentasDelEdificio(orgId: string, edificioId: string): Promise<CuentaDestino[]>;

  /** El residente avisa que pagó: queda por validar. */
  reportar(envio: EnvioDePago): Promise<Resultado<string>>;
  /** El administrador registra lo que recibió: queda aceptado y aplicado. */
  registrar(envio: EnvioDePago): Promise<Resultado<string>>;
  aceptar(pagoId: string): Promise<Resultado<EstadoDelPago>>;
  rechazar(pagoId: string, motivo: string): Promise<Resultado<EstadoDelPago>>;
  revertir(pagoId: string): Promise<Resultado<EstadoDelPago>>;

  /** Sube el comprobante a `<org>/<unidad>/<clave>.<ext>`; repetir la subida lo reemplaza. */
  subirComprobante(orgId: string, unidadId: string, clave: string, archivo: ArchivoDeComprobante): Promise<Resultado<string>>;
  /** Una dirección temporal para ver el comprobante (el bucket es privado). */
  urlDeComprobante(ruta: string): Promise<string | null>;
}
