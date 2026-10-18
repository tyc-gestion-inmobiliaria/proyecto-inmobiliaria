/**
 * Los edificios de una administradora, leídos por el puerto, con su estado de
 * carga y cómo reintentar. Se vuelve a leer al montar la pantalla, así lo
 * recién guardado aparece al volver a la lista.
 */
import { useCallback, useEffect, useState } from "react";

import type { EdificiosPuerto } from "../aplicacion/puertos";
import { ordenarEdificios, type Edificio } from "../dominio/edificio";

export type CargaEdificios = { estado: "cargando" } | { estado: "error" } | { estado: "listo"; edificios: Edificio[] };

export function useEdificios(puerto: EdificiosPuerto, orgId: string) {
  const [carga, setCarga] = useState<CargaEdificios>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    puerto
      .listar(orgId)
      .then((edificios) => {
        if (vigente) setCarga({ estado: "listo", edificios: ordenarEdificios(edificios) });
      })
      .catch(() => {
        if (vigente) setCarga({ estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [puerto, orgId, intento]);

  // "cargando" se pone acá y no en el efecto: el efecto solo escucha la respuesta.
  const reintentar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setIntento((n) => n + 1);
  }, []);

  return { carga, reintentar };
}
