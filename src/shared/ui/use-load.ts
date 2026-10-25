/**
 * Una lectura por un puerto, con su estado de carga y cómo reintentar. Se
 * vuelve a leer al montar la pantalla, así lo recién guardado aparece al
 * volver. `leer` cambia cuando cambian sus claves (`useCallback` o el
 * compilador de React), y entonces se lee de nuevo.
 */
import { useCallback, useEffect, useState } from "react";

export type Carga<T> = { estado: "cargando" } | { estado: "error" } | { estado: "listo"; valor: T };

export function useCarga<T>(leer: () => Promise<T>) {
  const [carga, setCarga] = useState<Carga<T>>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    leer()
      .then((valor) => {
        if (vigente) setCarga({ estado: "listo", valor });
      })
      .catch(() => {
        if (vigente) setCarga({ estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [leer, intento]);

  // "cargando" se pone acá y no en el efecto: el efecto solo escucha la respuesta.
  const reintentar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setIntento((n) => n + 1);
  }, []);

  return { carga, reintentar };
}
