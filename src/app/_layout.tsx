import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { sesionSupabase } from "@/modulos/organizaciones/infraestructura/sesion-supabase";
import { ProveedorSesion, useSesion } from "@/modulos/organizaciones/ui/sesion";
import { temaDelProyecto } from "@/tema";
import { ThemeProvider, useStyles, useTheme, type Tema } from "@/ui";

export default function RootLayout() {
  return (
    <ThemeProvider theme={temaDelProyecto}>
      <ProveedorSesion puerto={sesionSupabase}>
        <Rutas />
      </ProveedorSesion>
    </ThemeProvider>
  );
}

/**
 * Sin sesión existen `/entrar` y `/recuperar`; con sesión, el grupo `(app)`;
 * al volver del enlace del correo, solo `/nueva-contrasena`. Las rutas
 * protegidas no se pueden abrir por URL sin haber entrado. `/invitacion`
 * existe siempre: se llega sin sesión y la abre el propio enlace.
 */
function Rutas() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { cuenta, cargando, recuperando } = useSesion();

  if (cargando) {
    return (
      <View style={s.espera} accessibilityLabel="Cargando">
        <ActivityIndicator color={t.color.text.secondary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="invitacion" />
      {/* Desde el enlace del correo solo existe la contraseña nueva. */}
      <Stack.Protected guard={recuperando}>
        <Stack.Screen name="nueva-contrasena" />
      </Stack.Protected>
      <Stack.Protected guard={!recuperando && cuenta !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!recuperando && cuenta === null}>
        <Stack.Screen name="entrar" />
        <Stack.Screen name="recuperar" />
      </Stack.Protected>
    </Stack>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    espera: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.color.bg.canvas },
  });
