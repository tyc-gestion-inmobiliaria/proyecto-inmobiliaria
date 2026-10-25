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
 * - **Migas:** con `back.trail`, en una ventana ancha arriba va el camino
 *   entero ("Edificios › Torre Sol"), cada tramo con su enlace. En el
 *   teléfono queda solo el nivel de arriba, con su flecha: el camino entero no
 *   entra y volver es lo que se usa.
 */
import { Fragment, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Button } from "./button";
import { Icon } from "./icon";
import { ScreenTitle } from "./surfaces";

export interface PageHeaderProps {
  title: string;
  /** El nivel de arriba: "Edificios", "Unidades". */
  back?: {
    label: string;
    onPress: () => void;
    accessibilityLabel?: string;
    /** Los niveles de más arriba, del primero al último: las migas en pantalla ancha. */
    trail?: { label: string; onPress: () => void }[];
  };
  /** Lo que va pegado al título: una insignia de estado. */
  status?: ReactNode;
  /** Los botones de la pantalla. El primario, si hay, va último. */
  actions?: ReactNode;
}

/** Desde este ancho de ventana entran las migas enteras. */
const ANCHO_PARA_MIGAS = 600;

export function PageHeader({ title, back, status, actions }: PageHeaderProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const migas = back?.trail && back.trail.length > 0 && width >= ANCHO_PARA_MIGAS ? back.trail : null;
  return (
    <View style={s.cabecera}>
      {back && migas ? (
        <View style={s.migas} role="navigation" aria-label="Migas">
          {migas.map((m) => (
            <Fragment key={m.label}>
              <Button variant="ghost" size="sm" label={m.label} accessibilityLabel={`Ir a ${m.label}`} onPress={m.onPress} />
              <Icon name="chevron-right" size="sm" color={t.color.text.secondary} />
            </Fragment>
          ))}
          <Button
            variant="ghost"
            size="sm"
            label={back.label}
            accessibilityLabel={back.accessibilityLabel ?? `Volver a ${back.label}`}
            onPress={back.onPress}
          />
        </View>
      ) : back ? (
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
          {/* La insignia se alinea arriba por su cuenta; junto al título va centrada. */}
          {status ? <View style={s.estado}>{status}</View> : null}
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
    migas: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", marginLeft: -t.space.sm },
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
    estado: { alignSelf: "center" },
    acciones: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm, maxWidth: "100%" },
  });
