/**
 * Lo que va donde no hay nada que mostrar.
 *
 * Contesta dos cosas y nada más: **por qué está vacío** y **qué se puede
 * hacer**. "No hay inmuebles con estos filtros" + "Quitar filtros" sirve;
 * una ilustración con "¡Ups! Nada por aquí" no.
 *
 * Hay dos vacíos distintos y conviene no confundirlos: el de **todavía no
 * hay nada** (acción: crear el primero) y el de **el filtro lo dejó en
 * cero** (acción: soltar el filtro).
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.caja} accessibilityRole="summary">
      <Text style={[textStyle(t, "subtitle"), s.centro]}>{title}</Text>
      {description ? <Text style={[textStyle(t, "body", t.color.text.secondary), s.centro, s.texto]}>{description}</Text> : null}
      {action ? <View style={s.accion}>{action}</View> : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    caja: {
      alignItems: "center",
      gap: t.space.sm,
      paddingVertical: t.space.xxl,
      paddingHorizontal: t.space.lg,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: t.color.border.strong,
    },
    centro: { textAlign: "center" },
    texto: { maxWidth: 420 },
    accion: { marginTop: t.space.xs },
  });
