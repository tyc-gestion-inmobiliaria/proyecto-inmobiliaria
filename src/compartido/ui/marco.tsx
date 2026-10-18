/**
 * El marco de la app con sesión: las secciones, la barra con el contexto de
 * trabajo (administradora y edificio) y la cuenta, y el contenido de la ruta.
 *
 * - **Ancho (web, tableta):** menú lateral con las secciones por tramos.
 * - **Angosto (teléfono):** las mismas secciones en una barra abajo, al
 *   alcance del pulgar, y el contenido con todo el ancho (PB-10).
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

const ENTRADAS = ordenarPorTramo(SECCIONES).map((x) => ({ key: x.key, label: x.label, group: x.grupo }));

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

  const angosto = width < ANCHO_ANGOSTO;
  const activa = seccionDeRuta(ruta)?.key;
  const correo = cuenta?.correo ?? "";

  const barra = (
    <>
      <View style={s.contexto}>
        {membresias.length > 1 && enCurso ? (
          <Select
            size="sm"
            value={enCurso.orgId}
            onChange={elegir}
            placeholder="Administradora"
            accessibilityLabel="Administradora"
            options={membresias.map((m) => ({ id: m.orgId, label: m.orgNombre, detail: nombreDelRol(m.rol) }))}
          />
        ) : enCurso ? (
          <Text style={[textStyle(t, "body"), s.nombreOrg]} numberOfLines={1}>
            {enCurso.orgNombre}
          </Text>
        ) : null}
        {edificios.length > 0 ? (
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
        ) : null}
      </View>
      <Button
        variant="ghost"
        size="sm"
        label={angosto || !correo ? "Cuenta ▾" : `${correo} ▾`}
        accessibilityLabel="Abrir el menú de la cuenta"
        onPress={() => setMenuCuenta((v) => !v)}
      />
    </>
  );

  const nota = enCurso ? `${correo}\n${nombreDelRol(enCurso.rol)} · ${enCurso.orgNombre}` : correo;

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
      overlay={menu}
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
            items={ENTRADAS}
            activeKey={activa}
            onSelect={(key) => irA(key, activa)}
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
    contexto: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    nombreOrg: { fontWeight: "600", flexShrink: 1 },
    menuCuenta: { right: t.space.xl },
  });
