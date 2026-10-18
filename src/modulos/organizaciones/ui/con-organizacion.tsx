/**
 * Lo que toda pantalla de la administradora hace antes de pintar lo suyo:
 * esperar a las membresías, decir si no se pudieron leer, y decir si la
 * cuenta no está en ninguna administradora. Con una en curso, pinta
 * `children` con ella.
 */
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { Membresia } from "../dominio/membresia";
import { useOrganizacion } from "./organizacion";

export function ConOrganizacion({ children }: { children: (enCurso: Membresia) => ReactNode }) {
  const s = useStyles(makeStyles);
  const { carga, enCurso, reintentar } = useOrganizacion();

  if (carga === "cargando") return <Cargando />;

  if (carga === "error") {
    return (
      <View style={s.pantalla}>
        <EmptyState
          title="No se pudo leer tu cuenta"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </View>
    );
  }

  if (!enCurso) {
    return (
      <View style={s.pantalla}>
        <EmptyState
          title="Tu cuenta no está en ninguna administradora"
          description="Pide a quien administra tu empresa que te invite."
        />
      </View>
    );
  }

  return <>{children(enCurso)}</>;
}

export function Cargando() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.cargando} accessibilityLiveRegion="polite">
      <ActivityIndicator color={t.color.text.secondary} />
      <Text style={textStyle(t, "body", t.color.text.secondary)}>Cargando…</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, padding: t.space.xl, maxWidth: 960, width: "100%" },
    cargando: { alignItems: "center", justifyContent: "center", gap: t.space.sm, paddingVertical: t.space.xxl },
  });
