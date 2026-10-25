/**
 * Fijar la contraseña nueva, al volver del enlace del correo (PB-05).
 *
 * Es la única pantalla que existe mientras dura la recuperación. Al
 * guardarla, la persona ya queda dentro y sigue a su cartera; si se arrepiente,
 * "Cancelar" cierra la sesión del enlace y vuelve al inicio de sesión.
 */
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, TextField, useStyles, type Tema } from "@/ui";

import { LARGO_MINIMO_CONTRASENA, type ErroresNuevaContrasena } from "../domain/recovery";
import { useSesion } from "./session";
import { AvisoGeneral, TarjetaDeAcceso } from "./access-card";

export function PantallaNuevaContrasena() {
  const s = useStyles(makeStyles);
  const { fijarContrasena, dejarRecuperacion } = useSesion();

  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [errores, setErrores] = useState<ErroresNuevaContrasena>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    const r = await fijarContrasena({ nueva, repetida });
    setEnviando(false);
    // Con éxito el layout cambia de rama solo.
    if (r.ok) return;
    setErrores(r.campos);
    setErrorGeneral(r.general ?? null);
  }

  return (
    <TarjetaDeAcceso titulo="Contraseña nueva">
      <View style={s.campos}>
        <TextField
          label="Contraseña nueva"
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
          testID="nueva-contrasena"
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
          testID="nueva-contrasena-repetida"
        />
      </View>
      {errorGeneral ? <AvisoGeneral>{errorGeneral}</AvisoGeneral> : null}
      <Button label="Guardar la contraseña" onPress={enviar} loading={enviando} full size="lg" testID="nueva-guardar" />
      <Button label="Cancelar" variant="ghost" full onPress={() => void dejarRecuperacion()} />
    </TarjetaDeAcceso>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    campos: { gap: t.space.lg },
  });
