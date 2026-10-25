/**
 * El contexto de trabajo para el árbol con sesión: los edificios de la
 * administradora en curso y cuál está elegido.
 *
 * Se monta con `key` por administradora: al cambiarla, la elección vuelve a
 * la cartera entera en vez de arrastrar un edificio de otra. La lista se
 * vuelve a leer al cambiar de ruta (`ruta`), para que un edificio recién dado
 * de alta aparezca en el selector sin recargar la app.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { edificioEnCurso, type EdificioDelContexto, type EdificiosDelContextoPuerto } from "./context";

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

/**
 * El edificio elegido se recuerda en el navegador, por administradora: al
 * abrir otra sección por su dirección o recargar, se sigue en el mismo
 * edificio en vez de volver a preguntar. Si el navegador no guarda nada, se
 * empieza con toda la cartera, como antes.
 */
const CLAVE_DEL_ELEGIDO = "edificio-elegido";

function leerElegido(orgId: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(`${CLAVE_DEL_ELEGIDO}:${orgId}`);
  } catch {
    return null;
  }
}

function guardarElegido(orgId: string, id: string | null) {
  try {
    if (typeof localStorage === "undefined") return;
    if (id) localStorage.setItem(`${CLAVE_DEL_ELEGIDO}:${orgId}`, id);
    else localStorage.removeItem(`${CLAVE_DEL_ELEGIDO}:${orgId}`);
  } catch {
    // Sin almacenamiento, el elegido dura lo que la pestaña.
  }
}

export function ProveedorContexto({
  orgId,
  ruta,
  puerto,
  children,
}: {
  orgId: string | null;
  ruta: string;
  puerto: EdificiosDelContextoPuerto;
  children: ReactNode;
}) {
  const [carga, setCarga] = useState<Carga>("cargando");
  const [edificios, setEdificios] = useState<EdificioDelContexto[]>([]);
  const [elegido, setElegido] = useState<string | null>(() => (orgId ? leerElegido(orgId) : null));

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
  }, [orgId, puerto, ruta]);

  const elegirEdificio = useCallback(
    (id: string | null) => {
      setElegido(id);
      if (orgId) guardarElegido(orgId, id);
    },
    [orgId],
  );
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
