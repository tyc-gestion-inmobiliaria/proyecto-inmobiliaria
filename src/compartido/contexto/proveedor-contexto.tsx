/**
 * El contexto de trabajo para el árbol con sesión: los edificios de la
 * administradora en curso y cuál está elegido.
 *
 * Se monta con `key` por administradora: al cambiarla, la elección vuelve a
 * la cartera entera en vez de arrastrar un edificio de otra.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { edificioEnCurso, type EdificioDelContexto, type EdificiosDelContextoPuerto } from "./contexto";

type Carga = "cargando" | "lista" | "error";

interface EstadoContexto {
  carga: Carga;
  edificios: EdificioDelContexto[];
  /** El edificio elegido, o `null` para la cartera entera. */
  edificio: EdificioDelContexto | null;
  elegirEdificio: (id: string | null) => void;
}

const ContextoDeTrabajo = createContext<EstadoContexto | null>(null);

const SIN_ADMINISTRADORA: EstadoContexto = {
  carga: "lista",
  edificios: [],
  edificio: null,
  elegirEdificio: () => {},
};

export function ProveedorContexto({
  orgId,
  puerto,
  children,
}: {
  orgId: string | null;
  puerto: EdificiosDelContextoPuerto;
  children: ReactNode;
}) {
  const [carga, setCarga] = useState<Carga>("cargando");
  const [edificios, setEdificios] = useState<EdificioDelContexto[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let vigente = true;
    puerto
      .listar(orgId)
      .then((lista) => {
        if (!vigente) return;
        setEdificios(lista);
        setCarga("lista");
      })
      .catch(() => {
        if (vigente) setCarga("error");
      });
    return () => {
      vigente = false;
    };
  }, [orgId, puerto]);

  const elegirEdificio = useCallback((id: string | null) => setElegido(id), []);
  const edificio = useMemo(() => edificioEnCurso(edificios, elegido), [edificios, elegido]);
  const valor = useMemo(
    () => (orgId ? { carga, edificios, edificio, elegirEdificio } : SIN_ADMINISTRADORA),
    [orgId, carga, edificios, edificio, elegirEdificio],
  );
  return <ContextoDeTrabajo.Provider value={valor}>{children}</ContextoDeTrabajo.Provider>;
}

export function useContextoDeTrabajo(): EstadoContexto {
  const valor = useContext(ContextoDeTrabajo);
  if (!valor) throw new Error("useContextoDeTrabajo necesita un ProveedorContexto más arriba");
  return valor;
}
