/**
 * El menú lateral: una cabecera (el logo del proyecto), las entradas con su
 * inicial, y el botón de plegar.
 *
 * - **Lo elegido lleva borde, fondo y peso de letra**, no solo color.
 * - **Se pliega de verdad:** plegado quedan solo las iniciales y la pantalla
 *   gana el ancho. El nombre de cada entrada sigue yendo en su
 *   `accessibilityLabel` para quien no ve.
 * - **No navega por su cuenta:** avisa con `onSelect` y quien lo usa decide
 *   (con `router.push` de expo-router, con un estado, con lo que sea). Así el
 *   kit no depende del enrutador.
 *
 * El plegado se puede controlar desde fuera (`collapsed` + `onToggleCollapsed`)
 * o dejar que el menú lo lleve solo.
 */
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";

export interface SideMenuItem<K extends string = string> {
  key: K;
  label: string;
  /** La letra del cuadrito. Si falta, la primera del nombre. */
  initial?: string;
  disabled?: boolean;
}

export interface SideMenuProps<K extends string> {
  items: SideMenuItem<K>[];
  activeKey?: K;
  onSelect: (key: K) => void;
  /** Lo de arriba: el logo o el nombre del producto. Se oculta plegado. */
  header?: ReactNode;
  /** Lo de abajo: la cuenta, la versión. Se oculta plegado. */
  footer?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
  /** Nombre del menú para quien no ve: "Secciones", "Navegación principal". */
  accessibilityLabel?: string;
  texts?: { collapse: string; expand: string };
  width?: number;
  collapsedWidth?: number;
  style?: StyleProp<ViewStyle>;
  /** Solo para vitrina, Storybook y Figma: estado forzado por entrada. */
  forcedStates?: Partial<Record<K, ForcedInteraction>>;
}

export function SideMenu<K extends string>({
  items,
  activeKey,
  onSelect,
  header,
  footer,
  collapsible = true,
  collapsed: controlled,
  onToggleCollapsed,
  accessibilityLabel = "Menú",
  texts = { collapse: "Plegar el menú", expand: "Desplegar el menú" },
  width = 240,
  collapsedWidth = 68,
  style,
  forcedStates,
}: SideMenuProps<K>) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [own, setOwn] = useState(false);
  const collapsed = controlled ?? own;

  function toggle() {
    const next = !collapsed;
    if (controlled === undefined) setOwn(next);
    onToggleCollapsed?.(next);
  }

  return (
    <View
      style={[s.menu, { width: collapsed ? collapsedWidth : width }, style]}
      accessibilityRole="menu"
      accessibilityLabel={accessibilityLabel}
    >
      {header || collapsible ? (
        <View style={[s.header, collapsed && s.headerCollapsed]}>
          {collapsed ? null : <View style={s.headerContent}>{header}</View>}
          {collapsible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={collapsed ? texts.expand : texts.collapse}
              accessibilityState={{ expanded: !collapsed }}
              onPress={toggle}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state);
                return [s.toggle, i === "hovered" && s.toggleHovered, i === "pressed" && s.togglePressed];
              }}
            >
              <Text style={textStyle(t, "subtitle", t.color.text.secondary)}>{collapsed ? "»" : "«"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={s.items}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => onSelect(item.key)}
              style={(state: EstadoPresionable) => {
                const i = resolveInteraction(state, {
                  selected: active,
                  disabled: item.disabled,
                  forced: forcedStates?.[item.key],
                });
                return [
                  s.item,
                  collapsed && s.itemCollapsed,
                  i === "hovered" && s.itemHovered,
                  i === "pressed" && s.itemPressed,
                  i === "selected" && s.itemActive,
                ];
              }}
            >
              <View style={[s.initial, active ? s.initialActive : s.initialRest]}>
                <Text
                  style={[
                    textStyle(t, "caption", active ? t.color.text.onAccent : t.color.text.secondary),
                    s.initialText,
                    item.disabled && { color: t.color.text.disabled },
                  ]}
                >
                  {(item.initial ?? item.label.charAt(0)).toUpperCase()}
                </Text>
              </View>
              {collapsed ? null : (
                <Text
                  numberOfLines={1}
                  style={[
                    textStyle(t, "body", active ? t.color.accent.text : t.color.text.primary),
                    active && s.labelActive,
                    item.disabled && { color: t.color.text.disabled },
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {footer && !collapsed ? <View style={s.footer}>{footer}</View> : null}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    menu: {
      backgroundColor: t.color.bg.surface,
      borderRightWidth: 1,
      borderRightColor: t.color.border.default,
      paddingVertical: t.space.md,
    },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: t.space.lg + 4,
      paddingRight: t.space.sm,
      marginBottom: t.space.sm,
    },
    headerCollapsed: { justifyContent: "center", paddingLeft: t.space.sm },
    headerContent: { flex: 1 },
    toggle: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.sm,
      cursor: "pointer",
    },
    toggleHovered: { backgroundColor: t.color.bg.hover },
    togglePressed: { backgroundColor: t.color.bg.pressed },
    items: { gap: t.space.xxs },
    item: {
      minHeight: t.control.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      paddingLeft: t.space.lg + 1,
      paddingRight: t.space.lg,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
      cursor: "pointer",
    },
    itemCollapsed: { justifyContent: "center", paddingLeft: 0, paddingRight: 3 },
    itemHovered: { backgroundColor: t.color.bg.hover },
    itemPressed: { backgroundColor: t.color.bg.pressed },
    itemActive: { backgroundColor: t.color.accent.subtle, borderLeftColor: t.color.accent.base },
    initial: { width: 24, height: 24, borderRadius: t.radius.sm, alignItems: "center", justifyContent: "center" },
    initialActive: { backgroundColor: t.color.accent.base },
    initialRest: { backgroundColor: t.color.bg.muted },
    initialText: { fontWeight: "600" },
    labelActive: { fontWeight: "600" },
    footer: {
      marginTop: "auto",
      paddingHorizontal: t.space.lg + 4,
      paddingTop: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
  });
