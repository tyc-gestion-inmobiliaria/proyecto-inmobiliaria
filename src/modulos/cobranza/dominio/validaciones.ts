/**
 * Las validaciones del cierre (PB-17): se recalculan con cada cambio y cada
 * una dice su estado con texto, su causa y la acción que la resuelve.
 *
 * Supuesto a validar con el cliente: bloquean la participación distinta de
 * 100 % y la falta de cuenta bancaria; solo avisan las unidades sin lectura y
 * los consumos atípicos. La base vuelve a revisar las que bloquean al emitir.
 */

export interface EstadoDelPadron {
  unidades: number;
  sinParticipacion: number;
  /** Suma de las participaciones, en porcentaje. */
  total: number;
  sumaCien: boolean;
  cuentas: number;
}

export type ClaveDeValidacion = "participacion" | "cuenta" | "lecturas" | "atipicos";
export type DestinoDeAccion = "padron" | "cuentas" | "lecturas" | "revision";

export interface Validacion {
  clave: ClaveDeValidacion;
  titulo: string;
  estado: "ok" | "falla" | "aviso";
  bloquea: boolean;
  causa: string;
  accion?: { texto: string; destino: DestinoDeAccion };
}

const PORCENTAJE = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function validacionesDelCierre(padron: EstadoDelPadron, lecturas: { sinLectura: number; atipicos: number }): Validacion[] {
  const participacion: Validacion = padron.sumaCien
    ? { clave: "participacion", titulo: "Participaciones = 100 %", estado: "ok", bloquea: true, causa: "Suman exactamente 100 %." }
    : {
        clave: "participacion",
        titulo: "Participaciones = 100 %",
        estado: "falla",
        bloquea: true,
        causa:
          padron.unidades === 0
            ? "El edificio no tiene unidades."
            : padron.sinParticipacion > 0
              ? `${plural(padron.sinParticipacion, "unidad no tiene", "unidades no tienen")} participación; las demás suman ${PORCENTAJE.format(padron.total)} %.`
              : `Suman ${PORCENTAJE.format(padron.total)} %: ${padron.total < 100 ? "faltan" : "sobran"} ${PORCENTAJE.format(Math.abs(100 - padron.total))} %.`,
        accion: { texto: "Corregir en el padrón", destino: "padron" },
      };

  const cuenta: Validacion =
    padron.cuentas > 0
      ? {
          clave: "cuenta",
          titulo: "Cuenta bancaria configurada",
          estado: "ok",
          bloquea: true,
          causa: `${plural(padron.cuentas, "cuenta registrada", "cuentas registradas")}.`,
        }
      : {
          clave: "cuenta",
          titulo: "Cuenta bancaria configurada",
          estado: "falla",
          bloquea: true,
          causa: "El recibo no puede decir dónde pagar.",
          accion: { texto: "Registrar la cuenta", destino: "cuentas" },
        };

  const sinLectura: Validacion =
    lecturas.sinLectura === 0
      ? { clave: "lecturas", titulo: "Unidades con lectura", estado: "ok", bloquea: false, causa: "Todas tienen lectura." }
      : {
          clave: "lecturas",
          titulo: "Unidades con lectura",
          estado: "aviso",
          bloquea: false,
          causa: `${plural(lecturas.sinLectura, "unidad sin lectura no paga", "unidades sin lectura no pagan")} agua este mes.`,
          accion: { texto: "Cargar lecturas", destino: "lecturas" },
        };

  const atipicos: Validacion =
    lecturas.atipicos === 0
      ? { clave: "atipicos", titulo: "Consumos dentro de lo esperado", estado: "ok", bloquea: false, causa: "Ningún consumo atípico." }
      : {
          clave: "atipicos",
          titulo: "Consumos dentro de lo esperado",
          estado: "aviso",
          bloquea: false,
          causa: `${plural(lecturas.atipicos, "unidad consume", "unidades consumen")} bastante más que el promedio del edificio.`,
          accion: { texto: "Ver cuáles", destino: "revision" },
        };

  return [participacion, cuenta, sinLectura, atipicos];
}

export function bloqueantes(validaciones: readonly Validacion[]): Validacion[] {
  return validaciones.filter((v) => v.bloquea && v.estado === "falla");
}

/** Lo que se dice junto al botón de emitir cuando no se puede. */
export function motivoParaNoEmitir(validaciones: readonly Validacion[]): string | null {
  const b = bloqueantes(validaciones);
  if (b.length === 0) return null;
  return `No se puede emitir: ${b.map((v) => v.causa.replace(/\.$/, "").toLowerCase()).join("; ")}.`;
}
