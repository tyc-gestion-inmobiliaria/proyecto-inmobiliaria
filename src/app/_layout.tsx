import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { cargarFuente } from "@/shared/ui/font";
import { sesion } from "@/modules/organizations/infrastructure/session";
import { ProveedorSesion, useSesion } from "@/modules/organizations/ui/session";
import { temaDelProyecto } from "@/theme";
import { ThemeProvider, useStyles, useTheme, type Tema } from "@/ui";

// En web, la fuente del tema se declara una vez, antes de pintar nada.
cargarFuente();

export default function RootLayout() {
  // Va siempre en claro, como la marca de T&C: con el sistema en oscuro la app
  // se veía negra. El tema oscuro sigue definido y medido (`temaOscuroDelProyecto`)
  // para cuando se ofrezca elegirlo en la cuenta.
  return (
    <ThemeProvider theme={temaDelProyecto}>
      <ProveedorSesion puerto={sesion}>
        <Rutas />
      </ProveedorSesion>
    </ThemeProvider>
  );
}

/**
 * Sin sesión existen `/login` y `/forgot-password`; con sesión, el grupo `(app)`;
 * al volver del enlace del correo, solo `/reset-password`. Las rutas
 * protegidas no se pueden abrir por URL sin haber entrado. `/invitation`
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
      {/* Desde el enlace del correo solo existe la contraseña nueva. */}
      <Stack.Protected guard={recuperando}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!recuperando && cuenta !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!recuperando && cuenta === null}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      {/*
        Al final a propósito: al entrar o salir, el Stack muestra la primera
        pantalla que quede disponible; si fuera esta, toda sesión nueva caería
        en la invitación en vez de en Inicio.
      */}
      <Stack.Screen name="invitation" />
    </Stack>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    espera: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.color.bg.canvas },
  });
