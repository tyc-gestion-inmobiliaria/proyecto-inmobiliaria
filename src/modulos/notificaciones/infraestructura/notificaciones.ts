/**
 * Las notificaciones como las pide la ruta: Supabase o, en la maqueta, lo que
 * la bandeja tendría con los datos compartidos: un correo por responsable de
 * pago de cada recibo, "Sin correo" si no lo tiene. La maqueta no manda
 * correos: los de la semilla figuran enviados y los recién emitidos, por
 * enviar.
 */
import { demora, EN_MAQUETA } from "@/compartido/maqueta/modo";
import { mundo } from "@/compartido/maqueta/mundo";

import type { NotificacionesPuerto } from "../aplicacion/puertos";
import type { Envio } from "../dominio/envio";
import { notificacionesSupabase } from "./notificaciones-supabase";

const UN_MINUTO = 60_000;

const notificacionesDeMaqueta: NotificacionesPuerto = {
  delCierre(_orgId, cierreId) {
    const envios = mundo.recibos
      .filter((r) => r.cierreId === cierreId)
      .flatMap((r): Envio[] => {
        const reciente = Date.now() - new Date(r.emitidoEn).getTime() < UN_MINUTO;
        const responsables = mundo.vinculos.filter((v) => v.unidadId === r.unidadId && v.responsablePago);
        if (responsables.length === 0) {
          return [{ id: `${r.id}-nadie`, estado: "sin_correo", unidad: r.unidadNumero, destinatario: null, correo: null, motivo: "La unidad no tiene responsable de pago" }];
        }
        return responsables.map((v) => {
          const p = mundo.personas.find((x) => x.id === v.personaId);
          const correo = p?.correo ?? null;
          return {
            id: `${r.id}-${v.personaId}`,
            estado: correo ? (reciente ? "pendiente" : "enviado") : "sin_correo",
            unidad: r.unidadNumero,
            destinatario: p?.nombre ?? null,
            correo,
            motivo: correo ? null : "El responsable de pago no tiene correo",
          };
        });
      });
    return demora(envios);
  },
};

export const notificaciones: NotificacionesPuerto = EN_MAQUETA ? notificacionesDeMaqueta : notificacionesSupabase;
