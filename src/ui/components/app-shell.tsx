/**
 * El marco de una app de trabajo: barra de arriba (opcional), menú lateral y
 * el contenido.
 *
 * El marco no sabe qué hay en la barra ni en el menú: cada proyecto le pasa
 * los suyos. Lo que sí resuelve es lo que se repetía en cada módulo: el
 * reparto del espacio, el estado de carga, y los menús que se abren desde la
 * barra (`Menu`, `MenuNote`, `MenuItem`) con su fondo que los cierra.
 *
 * En la web, lo primero que toma el foco con el teclado es "Saltar al
 * contenido": sin él, cada pantalla pide recorrer la barra y el menú entero
 * (más de quince paradas) antes de llegar a lo que se vino a hacer. Está
 * fuera de la vista hasta que recibe el foco. El contenido es la región
 * principal (`main`).
 */
import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Icon } from "./icon";

export interface AppShellProps {
  /** El menú lateral, normalmente un `SideMenu`. */
  sidebar?: ReactNode;
  /** La barra de arriba: el nombre, la cuenta, lo que el proyecto quiera. */
  topBar?: ReactNode;
  /** La barra de abajo: en el teléfono, las secciones (`BottomNav`) en vez del menú lateral. */
  bottomBar?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  /** Lo que se dibuja encima de todo: los menús abiertos desde la barra. */
  overlay?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** El enlace para saltar la barra y el menú con el teclado (solo web). */
  skipLabel?: string;
}

/** El contenido recibe el foco del salto para que el siguiente Tab siga desde ahí; no es un control, no lleva anillo. */
const SIN_CONTORNO = { outlineStyle: "none" } as unknown as ViewStyle;

export function AppShell({
  sidebar,
  topBar,
  bottomBar,
  loading,
  loadingLabel = "Cargando…",
  overlay,
  children,
  style,
  skipLabel = "Saltar al contenido",
}: AppShellProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  // En una ventana angosta la barra pierde margen: cada punto de ancho cuenta.
  const angosto = useWindowDimensions().width < 768;
  const contenido = useRef<View>(null);
  const [saltoVisible, setSaltoVisible] = useState(false);
  // En la web la vista es un elemento del DOM; con tabIndex -1 toma el foco sin entrar en el recorrido.
  const enfocarContenido = () => (contenido.current as unknown as { focus?: () => void } | null)?.focus?.();
  const destino = Platform.OS === "web" ? ({ tabIndex: -1, role: "main" } as object) : null;
  return (
    <View style={[s.frame, style]}>
      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          onPress={enfocarContenido}
          onFocus={() => setSaltoVisible(true)}
          onBlur={() => setSaltoVisible(false)}
          style={[s.salto, !saltoVisible && s.saltoOculto]}
        >
          <Text style={textStyle(t, "body", t.color.text.onAccent)}>{skipLabel}</Text>
        </Pressable>
      ) : null}
      {topBar ? <View style={[s.topBar, angosto && s.topBarNarrow]}>{topBar}</View> : null}
      <View style={s.body}>
        {sidebar}
        <View ref={contenido} style={[s.content, Platform.OS === "web" && SIN_CONTORNO]} {...destino}>
          {loading ? (
            <View style={s.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator color={t.color.text.secondary} />
              <Text style={textStyle(t, "body", t.color.text.secondary)}>{loadingLabel}</Text>
            </View>
          ) : (
            children
          )}
        </View>
      </View>
      {bottomBar}
      {/* Al final: en React Native Web los hermanos se apilan por orden de aparición. */}
      {overlay}
    </View>
  );
}

/** Un fondo invisible que cierra el menú abierto al tocar fuera. */
export function MenuBackdrop({ onClose, label = "Cerrar el menú" }: { onClose: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={StyleSheet.absoluteFill}
      onPress={onClose}
    />
  );
}

/** La caja flotante de un menú. Se coloca con `style` (top, right…). */
export function Menu({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(makeStyles);
  return (
    <View style={[s.menu, style]} accessibilityRole="menu">
      {children}
    </View>
  );
}

/** Una nota sin acción arriba del menú: el correo de la cuenta, por ejemplo. */
export function MenuNote({ children }: { children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.note}>
      <Text style={textStyle(t, "caption", t.color.text.secondary)}>{children}</Text>
    </View>
  );
}

/** Una opción de menú. La actual lleva fondo, letra gruesa y ✓. */
export function MenuItem({
  label,
  current = false,
  disabled = false,
  destructive = false,
  onPress,
  forcedState,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  /** Para "Cerrar sesión", "Eliminar": en el color de peligro. */
  destructive?: boolean;
  onPress: () => void;
  forcedState?: ForcedInteraction;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const color = disabled ? t.color.text.disabled : destructive ? t.color.danger.fg : current ? t.color.accent.text : t.color.text.primary;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected: current, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(state: EstadoPresionable) => {
        const i = resolveInteraction(state, { selected: current, disabled, forced: forcedState });
        return [
          s.item,
          i === "hovered" && s.itemHovered,
          i === "pressed" && s.itemPressed,
          i === "selected" && s.itemCurrent,
        ];
      }}
    >
      <Text style={[textStyle(t, "bodySmall", color), current && s.itemTextCurrent]}>{label}</Text>
      {current ? <Icon name="check" size="sm" color={t.color.accent.text} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    frame: { flex: 1, backgroundColor: t.color.bg.canvas },
    topBar: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.lg,
      paddingHorizontal: t.space.xl,
      backgroundColor: t.color.bg.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.default,
    },
    topBarNarrow: { paddingHorizontal: t.space.lg, gap: t.space.sm },
    body: { flex: 1, flexDirection: "row" },
    content: { flex: 1 },
    salto: {
      position: "absolute",
      top: t.space.sm,
      left: t.space.sm,
      zIndex: 10,
      minHeight: t.control.md,
      justifyContent: "center",
      paddingHorizontal: t.space.lg,
      borderRadius: t.radius.md,
      backgroundColor: t.color.accent.base,
    },
    // Fuera de la vista pero en el recorrido del teclado: "display: none" lo sacaría del foco.
    saltoOculto: { left: -10000, width: 1, height: 1, minHeight: 0, overflow: "hidden", padding: 0 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: t.space.sm },
    menu: {
      position: "absolute",
      minWidth: 220,
      backgroundColor: t.color.bg.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: t.radius.md,
      overflow: "hidden",
      ...t.elevation.md,
    },
    note: {
      paddingHorizontal: t.space.md + 2,
      paddingVertical: t.space.sm + 2,
      backgroundColor: t.color.bg.muted,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.subtle,
    },
    item: {
      minHeight: t.control.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.space.md,
      paddingHorizontal: t.space.md + 2,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.subtle,
      cursor: "pointer",
    },
    itemHovered: { backgroundColor: t.color.bg.hover },
    itemPressed: { backgroundColor: t.color.bg.pressed },
    itemCurrent: { backgroundColor: t.color.accent.subtle },
    itemTextCurrent: { fontWeight: "600" },
  });
