/**
 * Aceptar una invitación (PB-23). Pública: se llega desde el correo, sin
 * sesión.
 *
 * El enlace trae el token de la invitación (`?token=`) y, en el fragmento, la
 * sesión que abrió Supabase Auth: `type=invite` si la cuenta es nueva (hay
 * que fijar la contraseña) o `type=magiclink` si ya existía (basta aceptar,
 * salvo que la cuenta siga sin contraseña: `cuenta_sin_contrasena`).
 * Si Auth rechazó el enlace, el fragmento trae un error.
 *
 * - Cuenta nueva: contraseña dos veces y "Aceptar y entrar".
 * - Cuenta que ya existía: solo "Aceptar y entrar".
 * - Si el enlace venció, ya se usó, se canceló o es de otro correo, se dice
 *   qué pasó y que pida otra a su administración; no queda nada que llenar.
 * - Aceptada, entra a la app.
 */
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Button, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { aceptar, mensajeAlAceptar } from "../application/invitations";
import type { InvitacionesPuerto, SesionPuerto } from "../application/ports";
import { leerEnlaceDeInvitacion } from "../domain/invitation";
import { LARGO_MINIMO_CONTRASENA, type ErroresNuevaContrasena } from "../domain/recovery";
import { useSesion } from "./session";
import { AvisoGeneral, TarjetaDeAcceso } from "./access-card";

type Paso =
  | { tipo: "leyendo" }
  | { tipo: "lista"; token: string; cuentaNueva: boolean }
  | { tipo: "sin-salida"; mensaje: string };

const ENLACE_VENCIDO = mensajeAlAceptar("sin-sesion");

/** En la web, la dirección completa (con el fragmento); en el teléfono, la que abrió la app. */
async function direccionActual(): Promise<string | null> {
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.href;
  return Linking.getInitialURL();
}

/** Saca de la barra de direcciones la sesión del fragmento, una vez leída. */
function limpiarFragmento() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export function PantallaInvitacion({ sesion, invitaciones }: { sesion: SesionPuerto; invitaciones: InvitacionesPuerto }) {
  const { cuenta, cargando } = useSesion();
  const params = useLocalSearchParams<{ token?: string }>();
  const [paso, setPaso] = useState<Paso>({ tipo: "leyendo" });
  const leido = useRef(false);

  useEffect(() => {
    if (cargando || leido.current) return;
    leido.current = true;
    let vigente = true;
    (async () => {
      const enlace = leerEnlaceDeInvitacion(await direccionActual());
      limpiarFragmento();
      const token = enlace.token ?? params.token ?? null;
      if (!token) return { tipo: "sin-salida", mensaje: mensajeAlAceptar("no_existe") } as const;
      if (enlace.vencido) return { tipo: "sin-salida", mensaje: ENLACE_VENCIDO } as const;
      if (enlace.sesion) {
        // `abrirRecuperacion` abre la sesión con los tokens del enlace; sirve igual para la invitación.
        const r = await sesion.abrirRecuperacion(enlace.sesion.tokenDeAcceso, enlace.sesion.tokenDeRenovacion);
        if (!r.ok) return { tipo: "sin-salida", mensaje: ENLACE_VENCIDO } as const;
        // Quien abrió el primer enlace sin terminar llega con un enlace mágico y sin contraseña: se le pide igual.
        const sinContrasena = await invitaciones.cuentaSinContrasena().catch(() => enlace.sesion?.cuentaNueva ?? false);
        return { tipo: "lista", token, cuentaNueva: enlace.sesion.cuentaNueva || sinContrasena } as const;
      }
      // Sin sesión en el enlace: sirve la que ya estaba abierta en este equipo.
      if (await sesion.cuentaActual()) {
        const sinContrasena = await invitaciones.cuentaSinContrasena().catch(() => false);
        return { tipo: "lista", token, cuentaNueva: sinContrasena } as const;
      }
      return { tipo: "sin-salida", mensaje: ENLACE_VENCIDO } as const;
    })().then((siguiente) => {
      if (vigente) setPaso(siguiente);
    });
    return () => {
      vigente = false;
    };
  }, [cargando, params.token, sesion, invitaciones]);

  if (paso.tipo === "leyendo") {
    return (
      <TarjetaDeAcceso titulo="Invitación">
        <Leyendo />
      </TarjetaDeAcceso>
    );
  }
  if (paso.tipo === "sin-salida") return <SinSalida mensaje={paso.mensaje} sesion={sesion} />;
  return (
    <Aceptar
      token={paso.token}
      cuentaNueva={paso.cuentaNueva}
      correo={cuenta?.correo ?? null}
      sesion={sesion}
      invitaciones={invitaciones}
      alRechazo={(mensaje) => setPaso({ tipo: "sin-salida", mensaje })}
    />
  );
}

function Leyendo() {
  const t = useTheme();
  return (
    <Text accessibilityLiveRegion="polite" style={textStyle(t, "body", t.color.text.secondary)}>
      Abriendo la invitación…
    </Text>
  );
}

function SinSalida({ mensaje, sesion }: { mensaje: string; sesion: SesionPuerto }) {
  const t = useTheme();
  return (
    <TarjetaDeAcceso titulo="No se pudo usar la invitación">
      <Text accessibilityRole="alert" style={textStyle(t, "body")} testID="invitacion-motivo">
        {mensaje}
      </Text>
      <Button
        label="Ir a iniciar sesión"
        variant="secondary"
        full
        onPress={async () => {
          // La sesión que abrió el enlace no le sirve a nadie: se cierra.
          await sesion.cerrar();
          router.replace("/login");
        }}
      />
    </TarjetaDeAcceso>
  );
}

function Aceptar({
  token,
  cuentaNueva,
  correo,
  sesion,
  invitaciones,
  alRechazo,
}: {
  token: string;
  cuentaNueva: boolean;
  correo: string | null;
  sesion: SesionPuerto;
  invitaciones: InvitacionesPuerto;
  alRechazo: (mensaje: string) => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [errores, setErrores] = useState<ErroresNuevaContrasena>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await aceptar(sesion, invitaciones, { token, contrasena: cuentaNueva ? { nueva, repetida } : undefined });
    setEnviando(false);
    if (r.ok) {
      router.replace("/");
      return;
    }
    if (r.definitivo && r.general) {
      alRechazo(r.general);
      return;
    }
    setErrores(r.campos);
    setGeneral(r.general ?? null);
  }

  return (
    <TarjetaDeAcceso titulo="Acepta la invitación">
      {correo ? (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>
          Entrarás como <Text style={s.correo}>{correo}</Text>.
        </Text>
      ) : null}
      {cuentaNueva ? (
        <View style={s.campos}>
          <TextField
            label="Contraseña"
            value={nueva}
            onChangeText={(v) => {
              setNueva(v);
              if (errores.nueva) setErrores((e) => ({ ...e, nueva: undefined }));
            }}
            helper={`Al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`}
            secureTextEntry
            autoCapitalize="none"
            autoFocus
            required
            error={errores.nueva}
            testID="invitacion-contrasena"
          />
          <TextField
            label="Repite la contraseña"
            value={repetida}
            onChangeText={(v) => {
              setRepetida(v);
              if (errores.repetida) setErrores((e) => ({ ...e, repetida: undefined }));
            }}
            secureTextEntry
            autoCapitalize="none"
            required
            error={errores.repetida}
            onSubmitEditing={enviar}
            testID="invitacion-contrasena-repetida"
          />
        </View>
      ) : null}
      {general ? <AvisoGeneral>{general}</AvisoGeneral> : null}
      <Button label="Aceptar y entrar" onPress={enviar} loading={enviando} full size="lg" testID="invitacion-aceptar" />
    </TarjetaDeAcceso>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    campos: { gap: t.space.lg },
    correo: { fontWeight: "600", color: t.color.text.primary },
  });
