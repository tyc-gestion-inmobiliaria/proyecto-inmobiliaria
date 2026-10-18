/**
 * Inicio de sesión con correo y contraseña (PB-05).
 *
 * - El error va junto al campo que hay que corregir, con texto; el de la red
 *   o de configuración va arriba del botón, porque no es de ningún campo.
 * - Con credenciales malas el mensaje es el mismo exista o no el correo.
 * - Enter en la contraseña envía el formulario.
 */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, ScreenTitle, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { ErroresCredenciales } from "../dominio/credenciales";
import { useSesion } from "./sesion";

export function PantallaEntrar() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { entrar } = useSesion();

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

  return (
    <KeyboardAvoidingView style={s.fondo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.contenido, { paddingTop: insets.top + t.space.xl, paddingBottom: insets.bottom + t.space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={s.tarjeta} padding="xl">
          <ScreenTitle>Iniciar sesión</ScreenTitle>
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
              autoCapitalize="none"
              required
              error={errores.contrasena}
              onSubmitEditing={enviar}
              testID="entrar-contrasena"
            />
          </View>
          {errorGeneral ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={textStyle(t, "bodySmall", t.color.danger.fg)}>
              ⚠ {errorGeneral}
            </Text>
          ) : null}
          <Button label="Entrar" onPress={enviar} loading={enviando} full size="lg" testID="entrar-enviar" />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fondo: { flex: 1, backgroundColor: t.color.bg.canvas },
    contenido: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.lg },
    tarjeta: { width: "100%", maxWidth: 400 },
    campos: { gap: t.space.lg },
  });
