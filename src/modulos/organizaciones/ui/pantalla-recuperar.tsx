/**
 * Pedir el correo para fijar una contraseña nueva (PB-05).
 *
 * Lo que se contesta es lo mismo exista o no la cuenta: decir "ese correo no
 * está registrado" le enseña a cualquiera qué correos sí lo están.
 */
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { Button, TextField, textStyle, useTheme } from "@/ui";

import { useSesion } from "./sesion";
import { AvisoGeneral, TarjetaDeAcceso } from "./tarjeta-de-acceso";

function volverAEntrar() {
  if (router.canGoBack()) router.back();
  else router.replace("/entrar");
}

export function PantallaRecuperar() {
  const t = useTheme();
  const { pedirRecuperacion } = useSesion();

  const [correo, setCorreo] = useState("");
  const [errorCorreo, setErrorCorreo] = useState<string | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    const r = await pedirRecuperacion(correo);
    setEnviando(false);
    if (r.ok) {
      setEnviado(true);
      return;
    }
    setErrorCorreo(r.correo);
    setErrorGeneral(r.general ?? null);
  }

  if (enviado) {
    return (
      <TarjetaDeAcceso titulo="Revisa tu correo">
        <Text accessibilityLiveRegion="polite" style={textStyle(t, "body")}>
          Si hay una cuenta con ese correo, te llegará un enlace para fijar una contraseña nueva. Si no lo ves en unos
          minutos, revisa la carpeta de spam.
        </Text>
        <Button label="Volver a iniciar sesión" onPress={volverAEntrar} full size="lg" testID="recuperar-volver" />
      </TarjetaDeAcceso>
    );
  }

  return (
    <TarjetaDeAcceso titulo="Recuperar la contraseña">
      <TextField
        label="Correo"
        value={correo}
        onChangeText={(v) => {
          setCorreo(v);
          if (errorCorreo) setErrorCorreo(undefined);
        }}
        placeholder="nombre@empresa.pe"
        keyboardType="email-address"
        autoCapitalize="none"
        autoFocus
        required
        error={errorCorreo}
        onSubmitEditing={enviar}
        testID="recuperar-correo"
      />
      {errorGeneral ? <AvisoGeneral>{errorGeneral}</AvisoGeneral> : null}
      <Button label="Enviar el enlace" onPress={enviar} loading={enviando} full size="lg" testID="recuperar-enviar" />
      <Button label="Volver a iniciar sesión" variant="ghost" full onPress={volverAEntrar} />
    </TarjetaDeAcceso>
  );
}
