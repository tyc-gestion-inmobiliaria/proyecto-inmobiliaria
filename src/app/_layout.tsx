import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";

import { cargarFuente } from "@/compartido/ui/fuente";
import { sesion } from "@/modulos/organizaciones/infraestructura/sesion";
import { ProveedorSesion, useSesion } from "@/modulos/organizaciones/ui/sesion";
import { temaDelProyecto, temaOscuroDelProyecto } from "@/tema";
import { ThemeProvider, useStyles, useTheme, type Tema } from "@/ui";

// En web, la fuente del tema se declara una vez, antes de pintar nada.
cargarFuente();

export default function RootLayout() {
  // El tema sigue al del sistema: claro u oscuro.
  const esquema = useColorScheme();
  return (
    <ThemeProvider theme={esquema === "dark" ? temaOscuroDelProyecto : temaDelProyecto}>
      <ProveedorSesion puerto={sesion}>
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
