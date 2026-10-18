/**
 * La sesión para todo el árbol: quién entró, y cómo entrar y salir.
 *
 * Mientras `cargando` es verdadero todavía no se sabe si hay sesión guardada:
 * las rutas esperan en vez de mandar al inicio de sesión a alguien que ya
 * había entrado.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { iniciarSesion, type ResultadoIniciarSesion } from "../aplicacion/iniciar-sesion";
import type { Cuenta, SesionPuerto } from "../aplicacion/puertos";
import type { Credenciales } from "../dominio/credenciales";

interface EstadoSesion {
  cuenta: Cuenta | null;
  cargando: boolean;
  entrar: (credenciales: Credenciales) => Promise<ResultadoIniciarSesion>;
  salir: () => Promise<void>;
}

const ContextoSesion = createContext<EstadoSesion | null>(null);

export function ProveedorSesion({ puerto, children }: { puerto: SesionPuerto; children: ReactNode }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    puerto
      .cuentaActual()
      .then((c) => {
        if (vigente) setCuenta(c);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    const dejar = puerto.alCambiar((c) => setCuenta(c));
    return () => {
      vigente = false;
      dejar();
    };
  }, [puerto]);

  const entrar = useCallback((credenciales: Credenciales) => iniciarSesion(puerto, credenciales), [puerto]);
  const salir = useCallback(() => puerto.cerrar(), [puerto]);

  const valor = useMemo(() => ({ cuenta, cargando, entrar, salir }), [cuenta, cargando, entrar, salir]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error("useSesion necesita un ProveedorSesion más arriba");
  return valor;
}
