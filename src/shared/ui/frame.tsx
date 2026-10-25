/**
 * El marco de la app con sesión: las secciones, la barra con el contexto de
 * trabajo (administradora y edificio) y la cuenta, y el contenido de la ruta.
 *
 * - **Ancho (web, tableta):** menú lateral con las secciones por tramos.
 * - **Angosto (teléfono):** las secciones en una barra abajo, al alcance del
 *   pulgar, y el contenido con todo el ancho (PB-10). Con más de cinco, van
 *   las cuatro del trabajo diario y "Más" abre el resto: más entradas no se
 *   leen en el ancho de un teléfono.
 * - **El selector de edificio** dice siempre dónde se está: "Toda la cartera"
 *   o el nombre del edificio. Con un edificio elegido el control queda
 *   marcado aunque esté cerrado, porque lo que se ve es un recorte.
 */
import { router, usePathname, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rutaAlCambiarDeEdificio, TODA_LA_CARTERA } from "@/shared/context/context";
import { useContextoDeTrabajo } from "@/shared/context/context-provider";
import { nombreDelRol } from "@/modules/organizations/domain/membership";
import { useOrganizacion } from "@/modules/organizations/ui/organization";
import { useSesion } from "@/modules/organizations/ui/session";
import {
  AppShell,
  Avatar,
  resolveInteraction,
  type EstadoPresionable,
  BottomNav,
  Icon,
  Menu,
  MenuBackdrop,
  MenuItem,
  MenuNote,
  Select,
  SideMenu,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { ordenarPorTramo, SECCIONES, seccionDeRuta, seccionesDelRol } from "../navigation/sections";

const ISOTIPO = require("../../../assets/brand/isotype.png");

const ANCHO_ANGOSTO = 768;
const ALTO_BARRA = 56;
const ALTO_BARRA_ABAJO = 64;

/**
 * Las que quedan a la vista en la barra del teléfono; el resto va en "Más".
 * El personal trabaja en el edificio: a mano, las lecturas.
 */
const EN_LA_BARRA: Record<string, string[]> = {
  personal: ["inicio", "lecturas", "unidades", "edificios"],
  otro: ["inicio", "edificios", "cobranza", "unidades"],
};
const MAS = "mas";

/** Las secciones que ve el rol, para el menú lateral, la barra del teléfono y su "Más". */
function entradasDelRol(rol: string | undefined) {
  const todas = ordenarPorTramo(seccionesDelRol(rol)).map((x) => ({ key: x.key, label: x.label, group: x.grupo, icon: x.icono }));
  const conMas = todas.length > 5;
  const enLaBarra = EN_LA_BARRA[rol ?? ""] ?? EN_LA_BARRA.otro;
  const barra = conMas
    ? [
        // En la barra va el nombre corto: el largo no entra en el ancho de un teléfono.
        ...enLaBarra.flatMap((k) => todas.filter((e) => e.key === k)).map((e) => ({ ...e, label: e.key === "unidades" ? "Unidades" : e.label })),
        { key: MAS, label: "Más", group: undefined, icon: "more-horizontal" as const },
      ]
    : todas;
  return { todas, conMas, enLaBarra, barra, mas: todas.filter((e) => !enLaBarra.includes(e.key)) };
}

function irA(key: string, activa: string | undefined) {
  const destino = SECCIONES.find((x) => x.key === key);
  if (destino && destino.key !== activa) router.navigate(destino.ruta);
}

export function Marco({ children }: { children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ruta = usePathname();
  const { cuenta, salir } = useSesion();
  const { membresias, enCurso, elegir } = useOrganizacion();
  const { edificios, edificio, elegirEdificio } = useContextoDeTrabajo();
  const [plegado, setPlegado] = useState(false);
  const [menuCuenta, setMenuCuenta] = useState(false);
  const [menuMas, setMenuMas] = useState(false);

  const angosto = width < ANCHO_ANGOSTO;
  const entradas = entradasDelRol(enCurso?.rol);
  const activa = seccionDeRuta(ruta)?.key;
  const correo = cuenta?.correo ?? "";

  const selectorDeOrg =
    membresias.length > 1 && enCurso ? (
      <Select
        size="sm"
        value={enCurso.orgId}
        onChange={elegir}
        placeholder="Administradora"
        accessibilityLabel="Administradora"
        options={membresias.map((m) => ({ id: m.orgId, label: m.orgNombre, detail: nombreDelRol(m.rol) }))}
      />
    ) : null;

  const barra = (
    <>
      <View style={s.contexto}>
        {/* El isotipo de T&C: el edificio con sus iniciales. */}
        <Image source={ISOTIPO} style={s.logo} resizeMode="contain" accessibilityLabel="T&C" />
        {selectorDeOrg ??
          // En el teléfono el nombre de la administradora ya es el título de Inicio y va en el menú de la cuenta.
          (enCurso && !angosto ? (
            <View style={s.nombreOrg}>
              <Text style={textStyle(t, "subtitle")} numberOfLines={1}>
                {enCurso.orgNombre}
              </Text>
              <Text style={textStyle(t, "caption", t.color.text.secondary)} numberOfLines={1}>
                {nombreDelRol(enCurso.rol)}
              </Text>
            </View>
          ) : null)}
        {!angosto && edificios.length > 0 && enCurso?.rol !== "residente" ? <View style={s.separador} /> : null}
        {edificios.length > 0 && enCurso?.rol !== "residente" ? (
          <View style={angosto ? s.selectorAngosto : s.selector}>
            <Select
              size="sm"
              value={edificio?.id ?? TODA_LA_CARTERA}
              neutro={TODA_LA_CARTERA}
              onChange={(valor) => {
                const id = valor === TODA_LA_CARTERA ? null : valor;
                elegirEdificio(id);
                // Dentro de un edificio, la pantalla pasa al otro: si no, la dirección lo volvería a elegir.
                const destino = rutaAlCambiarDeEdificio(ruta, id);
                if (destino) router.navigate(destino as Href);
              }}
              placeholder="Edificio"
              accessibilityLabel="Edificio"
              options={[
                { id: TODA_LA_CARTERA, label: "Toda la cartera" },
                ...edificios.map((e) => ({ id: e.id, label: e.nombre })),
              ]}
            />
          </View>
        ) : null}
      </View>
      {/* La cuenta: sus iniciales siempre; el correo, si hay ancho. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir el menú de la cuenta"
        accessibilityState={{ expanded: menuCuenta }}
        onPress={() => setMenuCuenta((v) => !v)}
        style={(estado: EstadoPresionable) => {
          const i = resolveInteraction(estado, { selected: menuCuenta });
          return [s.cuenta, (i === "hovered" || i === "selected") && s.cuentaEncima, i === "pressed" && s.cuentaPresionada];
        }}
      >
        <Avatar name={correo || "Cuenta"} size="sm" accessibilityLabel="" />
        {!angosto && correo ? (
          <Text style={[textStyle(t, "bodySmall", t.color.text.secondary), s.correo]} numberOfLines={1}>
            {correo}
          </Text>
        ) : null}
        <Icon name="chevron-down" size="sm" color={t.color.text.secondary} />
      </Pressable>
    </>
  );

  const nota = enCurso ? `${correo}\n${nombreDelRol(enCurso.rol)} · ${enCurso.orgNombre}` : correo;

  const activaEnLaBarra = entradas.conMas && activa && !entradas.enLaBarra.includes(activa) ? MAS : activa;

  const mas = menuMas ? (
    <>
      <MenuBackdrop onClose={() => setMenuMas(false)} />
      <Menu style={[s.menuMas, { bottom: insets.bottom + ALTO_BARRA_ABAJO }]}>
        {entradas.mas.map((e) => (
          <MenuItem
            key={e.key}
            label={e.label}
            current={e.key === activa}
            onPress={() => {
              setMenuMas(false);
              irA(e.key, activa);
            }}
          />
        ))}
      </Menu>
    </>
  ) : null;

  const menu = menuCuenta ? (
    <>
      <MenuBackdrop onClose={() => setMenuCuenta(false)} />
      <Menu style={[s.menuCuenta, { top: insets.top + ALTO_BARRA }]}>
        {nota ? <MenuNote>{nota}</MenuNote> : null}
        <MenuItem
          label="Cerrar sesión"
          destructive
          onPress={() => {
            setMenuCuenta(false);
            void salir();
          }}
        />
      </Menu>
    </>
  ) : null;

  return (
    <AppShell
      style={{ paddingTop: insets.top }}
      topBar={barra}
      overlay={menu ?? mas}
      sidebar={
        angosto ? undefined : (
          <SideMenu
            accessibilityLabel="Secciones"
            items={entradas.todas}
            activeKey={activa}
            onSelect={(key) => irA(key, activa)}
            collapsed={plegado}
            onToggleCollapsed={setPlegado}
          />
        )
      }
      bottomBar={
        angosto ? (
          <BottomNav
            accessibilityLabel="Secciones"
            items={entradas.barra}
            activeKey={activaEnLaBarra}
            onSelect={(key) => (key === MAS ? setMenuMas((v) => !v) : irA(key, activa))}
            style={{ paddingBottom: insets.bottom }}
          />
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    contexto: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    // Las proporciones del isotipo (215 × 256).
    logo: { width: 30, height: 36 },
    nombreOrg: { flexShrink: 1, maxWidth: 260 },
    separador: { width: 1, height: 28, backgroundColor: t.color.border.default },
    cuenta: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.sm,
      minHeight: t.minTouch,
      paddingHorizontal: t.space.sm,
      borderRadius: t.radius.full,
      cursor: "pointer",
    },
    cuentaEncima: { backgroundColor: t.color.bg.hover },
    cuentaPresionada: { backgroundColor: t.color.bg.pressed },
    correo: { maxWidth: 220 },
    selector: { minWidth: 200, maxWidth: 320 },
    selectorAngosto: { flex: 1, minWidth: 0 },
    menuCuenta: { right: t.space.lg },
    menuMas: { right: t.space.sm, left: t.space.sm },
  });
