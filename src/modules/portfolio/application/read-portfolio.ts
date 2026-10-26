/**
 * Lee la cartera de la administradora: la lista de edificios del padrón y su
 * estado, en cinco pedidos que van a la vez. Si uno falla, falla todo: una
 * fila a medias diría pendientes que no son.
 */
import type { EdificiosPuerto } from "@/modules/registry/application/ports";
import { ordenarEdificios } from "@/modules/registry/domain/building";

import { armarCartera, periodoEnCurso, type FilaCartera } from "../domain/portfolio";
import type { EstadoDeLaCarteraPuerto } from "./ports";

export async function leerCartera(
  edificios: Pick<EdificiosPuerto, "listar">,
  estado: EstadoDeLaCarteraPuerto,
  orgId: string,
  periodo: string = periodoEnCurso(),
): Promise<FilaCartera[]> {
  const [lista, padron, conCuenta, cierres, porValidar] = await Promise.all([
    edificios.listar(orgId),
    estado.padronPorEdificio(orgId),
    estado.edificiosConCuenta(orgId),
    estado.cierresDelPeriodo(orgId, periodo),
    estado.pagosPorValidar(orgId),
  ]);
  return armarCartera(ordenarEdificios(lista), padron, conCuenta, cierres, porValidar);
}
