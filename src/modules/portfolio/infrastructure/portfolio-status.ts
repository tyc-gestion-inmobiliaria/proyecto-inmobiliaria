/**
 * El estado de la cartera como lo piden las rutas: Supabase o, en la
 * maqueta, calculado sobre los datos en memoria como lo haría la vista
 * `participacion_por_edificio`.
 */
import { demora, EN_MAQUETA } from "@/shared/mock/mode";
import { mundo } from "@/shared/mock/world";

import type { EstadoDeLaCarteraPuerto } from "../application/ports";
import type { CierreDelMes, EstadoDelPadron } from "../domain/portfolio";
import { estadoCarteraSupabase } from "./portfolio-status-supabase";

const estadoDeMaqueta: EstadoDeLaCarteraPuerto = {
  padronPorEdificio(orgId) {
    const porEdificio = new Map<string, EstadoDelPadron>();
    for (const e of mundo.edificios.filter((x) => x.orgId === orgId)) {
      const unidades = mundo.unidades.filter((u) => u.edificioId === e.id);
      if (unidades.length === 0) continue;
      const total = Math.round(unidades.reduce((n, u) => n + (u.participacion ?? 0), 0) * 100) / 100;
      porEdificio.set(e.id, {
        unidades: unidades.length,
        sinParticipacion: unidades.filter((u) => u.participacion === null).length,
        total,
        sumaCien: total === 100,
      });
    }
    return demora(porEdificio);
  },
  edificiosConCuenta(orgId) {
    return demora(new Set(mundo.cuentas.filter((c) => c.orgId === orgId).map((c) => c.edificioId)));
  },
  cierresDelPeriodo(orgId, periodo) {
    const cierres = mundo.cierres.filter((c) => c.orgId === orgId && c.periodo === periodo);
    return demora(new Map(cierres.map((c): [string, CierreDelMes] => [c.edificioId, { estado: c.estado, paso: c.paso }])));
  },
  pagosPorValidar(orgId) {
    const porEdificio = new Map<string, number>();
    for (const p of mundo.pagos.filter((x) => x.orgId === orgId && x.estado === "por_validar")) {
      porEdificio.set(p.edificioId, (porEdificio.get(p.edificioId) ?? 0) + 1);
    }
    return demora(porEdificio);
  },
};

export const estadoCartera: EstadoDeLaCarteraPuerto = EN_MAQUETA ? estadoDeMaqueta : estadoCarteraSupabase;
