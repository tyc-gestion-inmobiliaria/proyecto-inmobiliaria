/**
 * Las administradoras de la persona y en cuál está trabajando.
 *
 * La elección filtra las consultas de las pantallas; la RLS garantiza que,
 * aunque el filtro faltara, solo vería las administradoras a las que
 * pertenece (Arquitectura §6.2).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { MembresiasPuerto } from "../application/ports";
import { organizacionEnCurso, type Membresia } from "../domain/membership";

type Carga = "cargando" | "lista" | "error";

interface EstadoOrganizacion {
  carga: Carga;
  membresias: Membresia[];
  enCurso: Membresia | null;
  elegir: (orgId: string) => void;
  reintentar: () => void;
}

const ContextoOrganizacion = createContext<EstadoOrganizacion | null>(null);

export function ProveedorOrganizacion({ puerto, children }: { puerto: MembresiasPuerto; children: ReactNode }) {
  const [carga, setCarga] = useState<Carga>("cargando");
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    puerto
      .mias()
      .then((m) => {
        if (!vigente) return;
        setMembresias(m);
        setCarga("lista");
      })
      .catch(() => {
        if (vigente) setCarga("error");
      });
    return () => {
      vigente = false;
    };
  }, [puerto, intento]);

  // "cargando" se pone acá y no en el efecto: el efecto solo escucha la respuesta.
  const reintentar = useCallback(() => {
    setCarga("cargando");
    setIntento((n) => n + 1);
  }, []);
  const enCurso = useMemo(() => organizacionEnCurso(membresias, elegida), [membresias, elegida]);
  const valor = useMemo(
    () => ({ carga, membresias, enCurso, elegir: setElegida, reintentar }),
    [carga, membresias, enCurso, reintentar],
  );
  return <ContextoOrganizacion.Provider value={valor}>{children}</ContextoOrganizacion.Provider>;
}

export function useOrganizacion(): EstadoOrganizacion {
  const valor = useContext(ContextoOrganizacion);
  if (!valor) throw new Error("useOrganizacion necesita un ProveedorOrganizacion más arriba");
  return valor;
}
