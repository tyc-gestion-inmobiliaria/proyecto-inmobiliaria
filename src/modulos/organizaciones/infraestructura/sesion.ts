/**
 * La sesión y las membresías como las piden las rutas: Supabase o, en la
 * maqueta, una cuenta de demostración.
 *
 * En la maqueta entra cualquier correo con una contraseña de al menos 8
 * caracteres, salvo `clave-mala`, que sirve para ver el error. El rol sale
 * del correo: `personal…` o `residente…`; cualquier otro, administrador. La
 * sesión se guarda en el navegador para no volver a entrar al recargar.
 */
import { Platform } from "react-native";

import { CLAVE_DE_SESION, demora, EN_MAQUETA } from "@/compartido/maqueta/modo";
import { mundo, NOMBRE_ORG_DEMO, ORG_DEMO } from "@/compartido/maqueta/mundo";

import type { Cuenta, MembresiasPuerto, SesionPuerto } from "../aplicacion/puertos";
import type { Rol } from "../dominio/membresia";
import { membresiasSupabase } from "./membresias-supabase";
import { sesionSupabase } from "./sesion-supabase";

function guardada(): Cuenta | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    const texto = localStorage.getItem(CLAVE_DE_SESION);
    return texto ? (JSON.parse(texto) as Cuenta) : null;
  } catch {
    return null;
  }
}

function guardar(cuenta: Cuenta | null) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    if (cuenta) localStorage.setItem(CLAVE_DE_SESION, JSON.stringify(cuenta));
    else localStorage.removeItem(CLAVE_DE_SESION);
  } catch {
    // Sin almacenamiento la sesión dura lo que la pestaña.
  }
}

function rolDelCorreo(correo: string): Rol {
  if (correo.startsWith("personal")) return "personal";
  if (correo.startsWith("residente")) return "residente";
  return "administrador";
}

function sesionDeMaqueta(): SesionPuerto {
  let cuenta = guardada();
  const avisos = new Set<(c: Cuenta | null) => void>();
  const cambiar = (c: Cuenta | null) => {
    cuenta = c;
    guardar(c);
    avisos.forEach((a) => a(c));
  };
  return {
    cuentaActual: async () => cuenta,
    async iniciar({ correo, contrasena }) {
      await demora(null);
      if (contrasena === "clave-mala" || contrasena.length < 8) return { ok: false, fallo: "credenciales" };
      const nueva = { id: `cuenta-${correo}`, correo };
      cambiar(nueva);
      return { ok: true, cuenta: nueva };
    },
    async cerrar() {
      cambiar(null);
    },
    pedirRecuperacion: () => demora({ ok: true }),
    abrirRecuperacion: () => demora({ ok: false, fallo: "enlace-vencido" }),
    fijarContrasena: () => demora({ ok: true }),
    alCambiar(aviso) {
      avisos.add(aviso);
      return () => {
        avisos.delete(aviso);
      };
    },
  };
}

function membresiasDeMaqueta(s: SesionPuerto): MembresiasPuerto {
  return {
    async mias() {
      const cuenta = await s.cuentaActual();
      if (!cuenta) return [];
      // Quien entró por una invitación tiene el rol de la invitación; los demás, el de su correo.
      const miembro = mundo.miembros.find((m) => m.orgId === ORG_DEMO && m.correo === cuenta.correo);
      return demora([{ orgId: ORG_DEMO, orgNombre: NOMBRE_ORG_DEMO, rol: miembro?.rol ?? rolDelCorreo(cuenta.correo) }]);
    },
  };
}

export const sesion: SesionPuerto = EN_MAQUETA ? sesionDeMaqueta() : sesionSupabase;
export const membresias: MembresiasPuerto = EN_MAQUETA ? membresiasDeMaqueta(sesion) : membresiasSupabase;
