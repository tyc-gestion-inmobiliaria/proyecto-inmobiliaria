/**
 * Inicio de sesión con correo y contraseña (PB-05).
 *
 * - El error va junto al campo que hay que corregir, con texto; el de la red
 *   o de configuración va arriba del botón, porque no es de ningún campo.
 * - Con credenciales malas el mensaje es el mismo exista o no el correo.
 * - Enter en la contraseña envía el formulario.
 * - "¿Olvidaste tu contraseña?" lleva a pedir el correo de recuperación. Si
 *   la persona vuelve de un enlace vencido, el aviso aparece acá.
 * - En la maqueta se dice con qué se entra: sin eso nadie adivina la clave.
 */
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { EN_MAQUETA } from "@/compartido/maqueta/modo";
import { Button, TextField, useStyles, type Tema } from "@/ui";

import type { ErroresCredenciales } from "../dominio/credenciales";
import { useSesion } from "./sesion";
import { AvisoGeneral, NotaDeAcceso, TarjetaDeAcceso } from "./tarjeta-de-acceso";

export function PantallaEntrar() {
  const s = useStyles(makeStyles);
  const { entrar, avisoDeEnlace } = useSesion();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<ErroresCredenciales>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    const r = await entrar({ correo, contrasena });
    setEnviando(false);
    // Con éxito el layout cambia de rama solo: no hace falta navegar desde acá.
    if (r.ok) return;
    setErrores(r.campos);
    setErrorGeneral(r.general ?? null);
  }

  const aviso = errorGeneral ?? avisoDeEnlace;

  return (
    <TarjetaDeAcceso titulo="Inicia sesión">
      {EN_MAQUETA ? (
        <NotaDeAcceso>Maqueta sin servidor: entra con cualquier correo y una contraseña de 8 caracteres o más.</NotaDeAcceso>
      ) : null}
      <View style={s.campos}>
        <TextField
          label="Correo"
          value={correo}
          onChangeText={(v) => {
            setCorreo(v);
            if (errores.correo) setErrores((e) => ({ ...e, correo: undefined }));
          }}
          placeholder="nombre@empresa.pe"
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
          required
          error={errores.correo}
          testID="entrar-correo"
        />
        <TextField
          label="Contraseña"
          value={contrasena}
          onChangeText={(v) => {
            setContrasena(v);
            if (errores.contrasena) setErrores((e) => ({ ...e, contrasena: undefined }));
          }}
          secureTextEntry
          revelable
          autoCapitalize="none"
          required
          error={errores.contrasena}
          onSubmitEditing={enviar}
          testID="entrar-contrasena"
        />
      </View>
      {aviso ? <AvisoGeneral>{aviso}</AvisoGeneral> : null}
      <Button label="Entrar" onPress={enviar} loading={enviando} full size="lg" testID="entrar-enviar" />
      <Button
        label="¿Olvidaste tu contraseña?"
        variant="ghost"
        full
        onPress={() => router.push("/recuperar")}
        testID="entrar-recuperar"
      />
    </TarjetaDeAcceso>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    campos: { gap: t.space.lg },
  });
