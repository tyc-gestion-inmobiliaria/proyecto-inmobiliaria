/**
 * La sesión para todo el árbol: quién entró, y cómo entrar, salir y
 * recuperar la contraseña.
 *
 * Mientras `cargando` es verdadero todavía no se sabe si hay sesión guardada
 * ni si la app se abrió desde el enlace de recuperación: las rutas esperan en
 * vez de mandar al inicio de sesión a alguien que ya había entrado.
 *
 * El enlace del correo llega a la raíz de la app con los tokens en el
 * fragmento. Se lee acá, a mano, en la web y en el teléfono por igual
 * (`detectSessionInUrl` está apagado en el cliente): así la app sabe que es
 * una recuperación antes de abrir la sesión, y muestra solo la pantalla de la
 * contraseña nueva.
 */
import * as Linking from "expo-linking";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { iniciarSesion, type ResultadoIniciarSesion } from "../application/sign-in";
import type { Cuenta, SesionPuerto } from "../application/ports";
import {
  fijarContrasena,
  mensajeDeContrasena,
  pedirRecuperacion,
  type ResultadoFijarContrasena,
  type ResultadoPedirRecuperacion,
} from "../application/recover-password";
import type { Credenciales } from "../domain/credentials";
import { esEnlaceDeInvitacion } from "../domain/invitation";
import { leerEnlaceDeRecuperacion, type NuevaContrasena } from "../domain/recovery";

interface EstadoSesion {
  cuenta: Cuenta | null;
  cargando: boolean;
  /** La app se abrió desde el enlace del correo: falta fijar la contraseña. */
  recuperando: boolean;
  /** Lo que salió mal al abrir el enlace del correo, para decirlo al entrar. */
  avisoDeEnlace: string | null;
  entrar: (credenciales: Credenciales) => Promise<ResultadoIniciarSesion>;
  salir: () => Promise<void>;
  pedirRecuperacion: (correo: string) => Promise<ResultadoPedirRecuperacion>;
  fijarContrasena: (datos: NuevaContrasena) => Promise<ResultadoFijarContrasena>;
  /** Deja la recuperación a medias: cierra la sesión del enlace. */
  dejarRecuperacion: () => Promise<void>;
}

const ContextoSesion = createContext<EstadoSesion | null>(null);

/** Adónde lleva el enlace del correo: la raíz de esta misma app. */
function direccionDeVuelta(): string {
  return Linking.createURL("/");
}

/** En la web, saca los tokens de la barra de direcciones una vez leídos. */
function limpiarDireccion() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export function ProveedorSesion({ puerto, children }: { puerto: SesionPuerto; children: ReactNode }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recuperando, setRecuperando] = useState(false);
  const [avisoDeEnlace, setAvisoDeEnlace] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    async function abrirEnlace(url: string | null): Promise<void> {
      // El enlace de una invitación lo lee su propia pantalla (`/invitation`).
      if (esEnlaceDeInvitacion(url)) return;
      const enlace = leerEnlaceDeRecuperacion(url);
      if (!enlace) return;
      limpiarDireccion();
      if (enlace.tipo === "vencido") {
        if (vigente) setAvisoDeEnlace(mensajeDeContrasena("enlace-vencido"));
        return;
      }
      // Se marca antes de abrir la sesión, para que las rutas no pasen por el inicio.
      if (vigente) setRecuperando(true);
      const r = await puerto.abrirRecuperacion(enlace.tokenDeAcceso, enlace.tokenDeRenovacion);
      if (!vigente) return;
      if (!r.ok) {
        setRecuperando(false);
        setAvisoDeEnlace(mensajeDeContrasena(r.fallo));
      }
    }

    const dejar = puerto.alCambiar((c) => setCuenta(c));
    const suscripcion = Linking.addEventListener("url", ({ url }) => void abrirEnlace(url));

    Linking.getInitialURL()
      .then(abrirEnlace)
      .catch(() => undefined)
      .then(() => puerto.cuentaActual())
      .then((c) => {
        if (vigente) setCuenta(c);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
      dejar();
      suscripcion.remove();
    };
  }, [puerto]);

  const entrar = useCallback(
    (credenciales: Credenciales) => {
      setAvisoDeEnlace(null);
      return iniciarSesion(puerto, credenciales);
    },
    [puerto],
  );
  const salir = useCallback(() => puerto.cerrar(), [puerto]);
  const pedir = useCallback(
    (correo: string) => {
      setAvisoDeEnlace(null);
      return pedirRecuperacion(puerto, correo, direccionDeVuelta());
    },
    [puerto],
  );
  const fijar = useCallback(
    async (datos: NuevaContrasena) => {
      const r = await fijarContrasena(puerto, datos);
      // Con la contraseña nueva la persona ya está dentro: sigue a su cartera.
      if (r.ok) setRecuperando(false);
      return r;
    },
    [puerto],
  );
  const dejarRecuperacion = useCallback(async () => {
    await puerto.cerrar();
    setRecuperando(false);
  }, [puerto]);

  const valor = useMemo(
    () => ({
      cuenta,
      cargando,
      recuperando,
      avisoDeEnlace,
      entrar,
      salir,
      pedirRecuperacion: pedir,
      fijarContrasena: fijar,
      dejarRecuperacion,
    }),
    [cuenta, cargando, recuperando, avisoDeEnlace, entrar, salir, pedir, fijar, dejarRecuperacion],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error("useSesion necesita un ProveedorSesion más arriba");
  return valor;
}
