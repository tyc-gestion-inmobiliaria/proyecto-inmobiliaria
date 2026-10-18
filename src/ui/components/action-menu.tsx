/**
 * El menú de acciones de una fila, una ficha o una vista: un botón
 * secundario que abre la lista de lo que se puede hacer.
 *
 * - **Lo destructivo vive acá, no a la vista.** Va al final, separado por una
 *   raya, en el color de peligro y con su palabra ("Quitar", "Anular"): el
 *   color no es la única señal.
 * - **Lo destructivo pregunta siempre.** El primer toque cambia la lista por
 *   la pregunta y dos salidas, con "No" primero. No hay forma de pedirle al
 *   menú que no pregunte.
 * - **Nunca es el primario de la vista**: el botón que lo abre es secundario
 *   (o fantasma), y dice qué abre.
 * - Va con `Modal`, como `Dialog`: anclado a la ventana, no al scroll, y se
 *   cierra con "atrás" en Android y tocando fuera.
 */
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";

import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { MenuItem } from "./app-shell";
import { menuPosition, orderActions, type ActionMenuItem, type Anchor } from "./action-menu-logic";
import { Button, type ButtonSize } from "./button";

export type { ActionMenuItem } from "./action-menu-logic";

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Lo que dice el botón: "Acciones", "Más". */
  label?: string;
  /** Lo que oye quien no ve: "Acciones de la unidad 101". */
  accessibilityLabel: string;
  variant?: "secondary" | "ghost";
  size?: ButtonSize;
  cancelLabel?: string;
  testID?: string;
}

const ANCHO_MENU = 240;

export function ActionMenu({
  items,
  label = "Acciones",
  accessibilityLabel,
  variant = "secondary",
  size = "sm",
  cancelLabel = "No",
  testID,
}: ActionMenuProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const ventana = useWindowDimensions();
  const disparador = useRef<View>(null);
  const [ancla, setAncla] = useState<Anchor | null>(null);
  const [alto, setAlto] = useState(0);
  const [preguntando, setPreguntando] = useState<ActionMenuItem | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const abierto = ancla !== null;
  const ordenadas = orderActions(items);

  function abrir() {
    disparador.current?.measureInWindow((x, y, width, height) => setAncla({ x, y, width, height }));
  }

  function cerrar() {
    setAncla(null);
    setPreguntando(null);
  }

  async function ejecutar(item: ActionMenuItem) {
    setTrabajando(true);
    try {
      await item.onPress();
    } finally {
      setTrabajando(false);
      cerrar();
    }
  }

  const posicion = ancla ? menuPosition(ancla, { width: ANCHO_MENU, height: alto }, ventana) : null;

  return (
    <View ref={disparador} collapsable={false}>
      <Button
        label={`${label} ▾`}
        variant={variant}
        size={size}
        accessibilityLabel={accessibilityLabel}
        onPress={abierto ? cerrar : abrir}
        testID={testID}
      />
      <Modal visible={abierto} transparent animationType="none" onRequestClose={cerrar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el menú" style={StyleSheet.absoluteFill} onPress={cerrar} />
        {posicion ? (
          <View
            style={[s.caja, { top: posicion.top, left: posicion.left, width: ANCHO_MENU }]}
            accessibilityRole="menu"
            accessibilityLabel={accessibilityLabel}
            onLayout={(e: LayoutChangeEvent) => setAlto(e.nativeEvent.layout.height)}
          >
            {preguntando?.destructive ? (
              <>
                <View style={s.pregunta}>
                  <Text accessibilityRole="alert" style={[textStyle(t, "bodySmall", t.color.danger.fg), s.preguntaTexto]}>
                    {preguntando.destructive.question}
                  </Text>
                </View>
                <MenuItem label={cancelLabel} onPress={() => setPreguntando(null)} />
                <MenuItem
                  label={preguntando.destructive.confirmLabel}
                  destructive
                  disabled={trabajando}
                  onPress={() => void ejecutar(preguntando)}
                />
              </>
            ) : (
              ordenadas.map((item, i) => (
                <View key={item.key}>
                  {item.destructive && !ordenadas[i - 1]?.destructive && i > 0 ? <View style={s.raya} /> : null}
                  <MenuItem
                    label={item.label}
                    destructive={Boolean(item.destructive)}
                    disabled={item.disabled || trabajando}
                    onPress={() => (item.destructive ? setPreguntando(item) : void ejecutar(item))}
                  />
                </View>
              ))
            )}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    caja: {
      position: "absolute",
      backgroundColor: t.color.bg.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: t.radius.md,
      overflow: "hidden",
      ...t.elevation.md,
    },
    pregunta: {
      paddingHorizontal: t.space.md + 2,
      paddingVertical: t.space.md,
      backgroundColor: t.color.danger.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.subtle,
    },
    preguntaTexto: { fontWeight: "600" },
    raya: { height: 1, backgroundColor: t.color.border.default },
  });
