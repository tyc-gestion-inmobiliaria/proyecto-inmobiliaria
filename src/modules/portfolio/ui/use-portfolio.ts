/**
 * La cartera de una administradora leída por los puertos, con su estado de
 * carga y cómo reintentar. Se vuelve a leer al montar la pantalla, así un
 * edificio recién registrado aparece al volver al inicio.
 */
import { useCallback, useEffect, useState } from "react";

import type { EdificiosPuerto } from "@/modules/registry/application/ports";

import { leerCartera } from "../application/read-portfolio";
import type { EstadoDeLaCarteraPuerto } from "../application/ports";
import type { FilaCartera } from "../domain/portfolio";

export type CargaCartera = { estado: "cargando" } | { estado: "error" } | { estado: "listo"; filas: FilaCartera[] };

export function useCartera(edificios: EdificiosPuerto, estado: EstadoDeLaCarteraPuerto, orgId: string) {
  const [carga, setCarga] = useState<CargaCartera>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    leerCartera(edificios, estado, orgId)
      .then((filas) => {
        if (vigente) setCarga({ estado: "listo", filas });
      })
      .catch(() => {
        if (vigente) setCarga({ estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [edificios, estado, orgId, intento]);

  const reintentar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setIntento((n) => n + 1);
  }, []);

  return { carga, reintentar };
}
