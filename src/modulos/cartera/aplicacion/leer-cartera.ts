/**
 * Lee la cartera de la administradora: la lista de edificios del padrón y su
 * estado, en cuatro pedidos que van a la vez. Si uno falla, falla todo: una
 * fila a medias diría pendientes que no son.
 */
import type { EdificiosPuerto } from "@/modulos/padron/aplicacion/puertos";
import { ordenarEdificios } from "@/modulos/padron/dominio/edificio";

import { armarCartera, periodoEnCurso, type FilaCartera } from "../dominio/cartera";
import type { EstadoDeLaCarteraPuerto } from "./puertos";

export async function leerCartera(
  edificios: Pick<EdificiosPuerto, "listar">,
  estado: EstadoDeLaCarteraPuerto,
  orgId: string,
  periodo: string = periodoEnCurso(),
): Promise<FilaCartera[]> {
  const [lista, padron, conCuenta, cierres] = await Promise.all([
    edificios.listar(orgId),
    estado.padronPorEdificio(orgId),
    estado.edificiosConCuenta(orgId),
    estado.cierresDelPeriodo(orgId, periodo),
  ]);
  return armarCartera(ordenarEdificios(lista), padron, conCuenta, cierres);
}
