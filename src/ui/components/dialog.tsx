/**
 * Un diálogo: velo oscuro, caja centrada, título, cuerpo y pie.
 *
 * Va con el `Modal` de React Native y no con un `View` absoluto, y la
 * diferencia no es cosmética: un `position: absolute` dentro de un
 * `ScrollView` se ancla al alto del **contenido**, no al de la ventana, y en
 * una pantalla larga el diálogo aparecía a mitad del scroll, fuera de la
 * vista. `Modal` lo ancla a la ventana y de paso trae el cierre con "atrás"
 * en Android.
 *
 * Tiene dos salidas: la ✕, que es la que se ve, y tocar fuera, que es la que
 * se usa cuando ya se sabe.
 *
 * `DialogPanel` es la caja sin el `Modal`, para mostrarla en línea (vitrina,
 * Storybook) o para montarla en otra capa.
 */
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { resolveInteraction, type EstadoPresionable } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import { TouchArea } from "./touch-area";
import type { Tema } from "../tokens";
import { DialogTitle } from "./surfaces";

export interface DialogPanelProps {
  title?: string;
  children?: ReactNode;
  /** Los botones de abajo. La acción principal va a la derecha. */
  footer?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  width?: number;
}

export function DialogPanel({ title, children, footer, onClose, closeLabel = "Cerrar", width = 520 }: DialogPanelProps) {
  const s = useStyles(makeStyles);
  return (
    <View style={[s.panel, { maxWidth: width }]} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={s.body}>
        {title ? (
          // Deja sitio a la ✕, que va arriba a la derecha.
          <View style={onClose ? s.titleWithClose : undefined}>
            <DialogTitle>{title}</DialogTitle>
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={s.footer}>{footer}</View> : null}
      {onClose ? <CloseButton onClose={onClose} label={closeLabel} /> : null}
    </View>
  );
}

/** El velo con un diálogo encima, anclado a la ventana. */
export function ModalScrim({
  visible = true,
  onClose,
  closeLabel = "Cerrar",
  children,
}: {
  visible?: boolean;
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
}) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.scrim}>
        {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

export function Dialog({ visible, ...panel }: DialogPanelProps & { visible: boolean }) {
  return (
    <ModalScrim visible={visible} onClose={panel.onClose} closeLabel={panel.closeLabel}>
      <DialogPanel {...panel} />
    </ModalScrim>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onClose}
      // 32 de lado más 8 por lado: 48 tocables sin robarle sitio al título.
      hitSlop={8}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state);
        return [s.close, i === "hovered" && s.closeHovered, i === "pressed" && s.closePressed];
      }}
    >
      <Text style={[textStyle(t, "body", t.color.text.secondary), s.closeText]}>✕</Text>
      <TouchArea height={32} width={32} border={0} />
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    scrim: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: t.space.xl,
      backgroundColor: t.color.bg.scrim,
    },
    panel: {
      width: "100%",
      maxHeight: "92%",
      backgroundColor: t.color.bg.surface,
      borderRadius: t.radius.lg,
      // El borde separa el panel de lo de atrás en el tema oscuro, donde la sombra casi no se ve.
      borderWidth: 1,
      borderColor: t.color.border.default,
      ...t.elevation.modal,
    },
    body: { padding: t.space.xl, gap: t.space.md },
    titleWithClose: { paddingRight: 40 },
    footer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: t.space.sm,
      paddingHorizontal: t.space.xl,
      paddingVertical: t.space.lg,
      borderTopWidth: 1,
      borderTopColor: t.color.border.default,
    },
    close: {
      position: "absolute",
      top: t.space.md,
      right: t.space.md,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    closeHovered: { backgroundColor: t.color.bg.hover },
    closePressed: { backgroundColor: t.color.bg.pressed },
    closeText: { fontSize: 15, lineHeight: 18 },
  });
