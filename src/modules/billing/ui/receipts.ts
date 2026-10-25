/**
 * Descargar un recibo emitido: lee lo que el recibo impreso necesita (el
 * edificio, la administradora y dónde pagar) y lo manda a imprimir.
 */
import type { CobranzaPuerto } from "../application/ports";
import { htmlDelRecibo, textoDeNumero, type Recibo } from "../domain/receipt";
import { descargarRecibo } from "./download-receipt";

export async function descargar(cobranza: CobranzaPuerto, orgId: string, recibo: Recibo): Promise<boolean> {
  try {
    const [edificio, administradora, cuentas] = await Promise.all([
      cobranza.edificio(orgId, recibo.edificioId),
      cobranza.nombreDeLaAdministradora(orgId),
      cobranza.cuentas(orgId, recibo.edificioId),
    ]);
    const html = htmlDelRecibo(recibo, {
      edificio: edificio?.nombre ?? "",
      direccion: edificio?.direccion ?? null,
      administradora,
      cuentas,
    });
    return await descargarRecibo(html, `Recibo ${textoDeNumero(recibo.numero)} - Unidad ${recibo.unidadNumero}`);
  } catch {
    return false;
  }
}
