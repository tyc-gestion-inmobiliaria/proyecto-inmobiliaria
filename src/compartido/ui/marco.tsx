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
import { router, usePathname } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TODA_LA_CARTERA } from "@/compartido/contexto/contexto";
import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { nombreDelRol } from "@/modulos/organizaciones/dominio/membresia";
import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { useSesion } from "@/modulos/organizaciones/ui/sesion";
import {
  AppShell,
  BottomNav,
  Button,
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

import { ordenarPorTramo, SECCIONES, seccionDeRuta } from "../navegacion/secciones";

const ANCHO_ANGOSTO = 768;
const ALTO_BARRA = 56;
const ALTO_BARRA_ABAJO = 64;

const ENTRADAS = ordenarPorTramo(SECCIONES).map((x) => ({ key: x.key, label: x.label, group: x.grupo, icon: x.icono }));

/** Las que quedan a la vista en la barra del teléfono; el resto va en "Más". */
const EN_LA_BARRA = ["inicio", "edificios", "cobranza", "unidades"];
const MAS = "mas";
const CON_MAS = ENTRADAS.length > 5;
const ENTRADAS_DE_LA_BARRA = CON_MAS
  ? [
      // En la barra va el nombre corto: el largo no entra en el ancho de un teléfono.
      ...EN_LA_BARRA.flatMap((k) => ENTRADAS.filter((e) => e.key === k)).map((e) => ({ ...e, label: e.key === "unidades" ? "Unidades" : e.label })),
      { key: MAS, label: "Más", group: undefined, icon: "more-horizontal" as const },
    ]
  : ENTRADAS;
const ENTRADAS_DE_MAS = ENTRADAS.filter((e) => !EN_LA_BARRA.includes(e.key));

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
        <View style={s.logo} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="building" size="sm" color={t.color.text.onAccent} />
        </View>
        {selectorDeOrg ??
          // En el teléfono el nombre de la administradora ya es el título de Inicio y va en el menú de la cuenta.
          (enCurso && !angosto ? (
            <Text style={[textStyle(t, "subtitle"), s.nombreOrg]} numberOfLines={1}>
              {enCurso.orgNombre}
            </Text>
          ) : null)}
        {edificios.length > 0 ? (
          <View style={angosto ? s.selectorAngosto : s.selector}>
            <Select
              size="sm"
              value={edificio?.id ?? TODA_LA_CARTERA}
              neutro={TODA_LA_CARTERA}
              onChange={(id) => elegirEdificio(id === TODA_LA_CARTERA ? null : id)}
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
      <Button
        variant="ghost"
        size="sm"
        icon="chevron-down"
        iconPosition="end"
        label={angosto || !correo ? "Cuenta" : correo}
        accessibilityLabel="Abrir el menú de la cuenta"
        onPress={() => setMenuCuenta((v) => !v)}
      />
    </>
  );

  const nota = enCurso ? `${correo}\n${nombreDelRol(enCurso.rol)} · ${enCurso.orgNombre}` : correo;

  const activaEnLaBarra = CON_MAS && activa && !EN_LA_BARRA.includes(activa) ? MAS : activa;

  const mas = menuMas ? (
    <>
      <MenuBackdrop onClose={() => setMenuMas(false)} />
      <Menu style={[s.menuMas, { bottom: insets.bottom + ALTO_BARRA_ABAJO }]}>
        {ENTRADAS_DE_MAS.map((e) => (
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
            items={ENTRADAS}
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
            items={ENTRADAS_DE_LA_BARRA}
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
    logo: {
      width: 32,
      height: 32,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.base,
    },
    nombreOrg: { flexShrink: 1 },
    selector: { minWidth: 200, maxWidth: 320 },
    selectorAngosto: { flex: 1, minWidth: 0 },
    menuCuenta: { right: t.space.lg },
    menuMas: { right: t.space.sm, left: t.space.sm },
  });
