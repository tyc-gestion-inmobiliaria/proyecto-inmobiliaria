/**
 * El menú lateral: una cabecera (el logo del proyecto), las entradas con su
 * ícono (o su inicial, si no traen ícono), y el botón de plegar.
 *
 * - **Lo elegido lleva borde, fondo y peso de letra**, no solo color.
 * - **Se pliega de verdad:** plegado quedan solo los íconos y la pantalla
 *   gana el ancho. El nombre de cada entrada sigue yendo en su
 *   `accessibilityLabel` para quien no ve.
 * - **Agrupa por tramos** (`group`): las entradas seguidas con el mismo
 *   `group` van bajo su título; plegado, el título se vuelve una raya. Las
 *   que no llevan `group` van sin título, arriba.
 * - **No navega por su cuenta:** avisa con `onSelect` y quien lo usa decide
 *   (con `router.push` de expo-router, con un estado, con lo que sea). Así el
 *   kit no depende del enrutador.
 *
 * El plegado se puede controlar desde fuera (`collapsed` + `onToggleCollapsed`)
 * o dejar que el menú lo lleve solo.
 */
import { Fragment, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { resolveInteraction, type EstadoPresionable, type ForcedInteraction } from "../pressable-state";
import { textStyle } from "../theme/text-style";
import { useStyles, useTheme } from "../theme/theme-provider";
import type { Tema } from "../tokens";
import { Icon } from "./icon";
import type { IconName } from "./icon-paths";

export interface SideMenuItem<K extends string = string> {
  key: K;
  label: string;
  /** El ícono de la entrada. Sin ícono, va la inicial en un cuadrito. */
  icon?: IconName;
  /** La letra del cuadrito, si no hay ícono. Si falta, la primera del nombre. */
  initial?: string;
  disabled?: boolean;
  /** El tramo al que pertenece: "Operación", "Gestión". */
  group?: string;
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

  const toggleButton = (
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
      <Icon name={collapsed ? "panel-left-open" : "panel-left-close"} />
    </Pressable>
  );

  return (
    <View
      style={[s.menu, { width: collapsed ? collapsedWidth : width }, style]}
      accessibilityRole="menu"
      accessibilityLabel={accessibilityLabel}
    >
      {header ? (
        <View style={[s.header, collapsed && s.headerCollapsed]}>
          {collapsed ? null : <View style={s.headerContent}>{header}</View>}
          {collapsible ? toggleButton : null}
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.items}>
        {items.map((item, index) => {
          const active = item.key === activeKey;
          const abreTramo = item.group !== undefined && item.group !== items[index - 1]?.group;
          return (
            <Fragment key={item.key}>
              {abreTramo ? (
                collapsed ? (
                  <View style={s.groupRule} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                ) : (
                  <Text accessibilityRole="header" style={[textStyle(t, "caption", t.color.text.secondary), s.groupTitle]}>
                    {item.group}
                  </Text>
                )
              ) : null}
              <Pressable
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
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    color={item.disabled ? t.color.text.disabled : active ? t.color.accent.text : t.color.text.secondary}
                    strokeWidth={active ? 2.25 : 2}
                  />
                ) : (
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
                )}
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
            </Fragment>
          );
        })}
      </ScrollView>

      {footer && !collapsed ? <View style={s.footer}>{footer}</View> : null}
      {/* Sin cabecera, el botón de plegar va abajo: arriba dejaría un hueco con solo la flecha. */}
      {!header && collapsible ? <View style={[s.toggleBottom, collapsed && s.headerCollapsed]}>{toggleButton}</View> : null}
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
      paddingLeft: t.space.lg,
      paddingRight: t.space.sm,
      marginBottom: t.space.sm,
    },
    headerCollapsed: { justifyContent: "center", paddingLeft: t.space.sm },
    headerContent: { flex: 1 },
    scroll: { flex: 1 },
    toggleBottom: { flexDirection: "row", paddingHorizontal: t.space.sm, paddingTop: t.space.sm },
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
    items: { gap: t.space.xxs, paddingHorizontal: t.space.sm },
    item: {
      minHeight: t.control.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.md,
      paddingLeft: t.space.md - 3,
      paddingRight: t.space.md,
      borderRadius: t.radius.sm,
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
    groupTitle: { paddingLeft: t.space.lg + 4, paddingTop: t.space.lg, paddingBottom: t.space.xs, fontWeight: "600" },
    groupRule: { height: 1, marginHorizontal: t.space.md, marginVertical: t.space.sm, backgroundColor: t.color.border.subtle },
    footer: {
      marginTop: "auto",
      paddingHorizontal: t.space.lg + 4,
      paddingTop: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
  });
