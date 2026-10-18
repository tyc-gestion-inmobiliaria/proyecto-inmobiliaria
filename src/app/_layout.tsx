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
 * Sin sesión solo existe `/entrar`; con sesión, el grupo `(app)`. Las rutas
 * protegidas no se pueden abrir por URL sin haber entrado.
 */
function Rutas() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { cuenta, cargando } = useSesion();

  if (cargando) {
    return (
      <View style={s.espera} accessibilityLabel="Cargando">
        <ActivityIndicator color={t.color.text.secondary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={cuenta !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={cuenta === null}>
        <Stack.Screen name="entrar" />
      </Stack.Protected>
    </Stack>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    espera: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.color.bg.canvas },
  });
