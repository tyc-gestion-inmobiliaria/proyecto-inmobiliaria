/**
 * Lo que toda pantalla de la administradora hace antes de pintar lo suyo:
 * esperar a las membresías, decir si no se pudieron leer, y decir si la
 * cuenta no está en ninguna administradora. Con una en curso, pinta
 * `children` con ella.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Button, EmptyState, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { Membresia } from "../domain/membership";
import { useOrganizacion } from "./organization";

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

/** Lo que tarda menos que esto no muestra la rueda: aparecer y desaparecer enseguida se lee como un parpadeo. */
const ESPERA_ANTES_DE_LA_RUEDA = 300;

export function Cargando() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const espera = setTimeout(() => setVisible(true), ESPERA_ANTES_DE_LA_RUEDA);
    return () => clearTimeout(espera);
  }, []);
  // El hueco se reserva igual, para que la pantalla no salte cuando aparece.
  if (!visible) return <View style={s.cargando} />;
  return (
    <View style={s.cargando} accessibilityLiveRegion="polite">
      <ActivityIndicator color={t.color.text.secondary} />
      <Text style={textStyle(t, "body", t.color.text.secondary)}>Cargando…</Text>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    cargando: { alignItems: "center", justifyContent: "center", gap: t.space.sm, paddingVertical: t.space.xxl },
  });
