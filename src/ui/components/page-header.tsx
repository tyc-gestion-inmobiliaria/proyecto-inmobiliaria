/**
 * La cabecera de una pantalla: el enlace para subir un nivel, el título con
 * su estado al lado, y las acciones de la pantalla.
 *
 * - **Las acciones van junto al título**, no flotando en la otra punta de una
 *   pantalla ancha: con el título a la izquierda y las acciones a la derecha
 *   de la misma fila, el ojo las encuentra donde lee.
 * - **Nada se sale por el costado.** En una ventana angosta las acciones
 *   bajan debajo del título y, si siguen sin caber, se reparten en varias
 *   filas. Una fila de botones que obliga a desplazarse de costado esconde la
 *   última acción (que suele ser la principal).
 * - **Sin etiqueta encima ni bajada debajo:** el título va solo. El estado
 *   (`status`) es una insignia con su palabra, no una frase.
 */
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useStyles } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Button } from "./button";
import { ScreenTitle } from "./surfaces";

export interface PageHeaderProps {
  title: string;
  /** El nivel de arriba: "Edificios", "Unidades". */
  back?: { label: string; onPress: () => void; accessibilityLabel?: string };
  /** Lo que va pegado al título: una insignia de estado. */
  status?: ReactNode;
  /** Los botones de la pantalla. El primario, si hay, va último. */
  actions?: ReactNode;
}

export function PageHeader({ title, back, status, actions }: PageHeaderProps) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.cabecera}>
      {back ? (
        <View style={s.volver}>
          <Button
            variant="ghost"
            size="sm"
            icon="chevron-left"
            label={back.label}
            accessibilityLabel={back.accessibilityLabel ?? `Volver a ${back.label.toLowerCase()}`}
            onPress={back.onPress}
          />
        </View>
      ) : null}
      <View style={s.fila}>
        <View style={s.titulo}>
          <ScreenTitle>{title}</ScreenTitle>
          {status}
        </View>
        {actions ? <View style={s.acciones}>{actions}</View> : null}
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    cabecera: { gap: t.space.xs },
    volver: { alignSelf: "flex-start", marginLeft: -t.space.sm },
    fila: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    titulo: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: t.space.sm,
    },
    acciones: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm, maxWidth: "100%" },
  });
