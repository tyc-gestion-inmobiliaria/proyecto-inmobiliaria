/**
 * El marco de la app con sesión: menú lateral por secciones, barra con la
 * administradora en curso y la cuenta, y el contenido de la ruta.
 *
 * En pantallas angostas el menú arranca plegado (solo iniciales), para que el
 * contenido tenga el ancho.
 */
import { router, usePathname } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { nombreDelRol } from "@/modulos/organizaciones/dominio/membresia";
import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { useSesion } from "@/modulos/organizaciones/ui/sesion";
import {
  AppShell,
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

import { SECCIONES, seccionDeRuta } from "../navegacion/secciones";

const ANCHO_ANGOSTO = 768;

export function Marco({ children }: { children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const ruta = usePathname();
  const { cuenta, salir } = useSesion();
  const { membresias, enCurso, elegir } = useOrganizacion();
  const [plegado, setPlegado] = useState(width < ANCHO_ANGOSTO);
  const [menuCuenta, setMenuCuenta] = useState(false);

  const activa = seccionDeRuta(ruta)?.key;

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
          <Text style={textStyle(t, "label")} numberOfLines={1}>
            {enCurso.orgNombre}
          </Text>
        ) : null}
      </View>
      <Button
        variant="ghost"
        size="sm"
        label={`${cuenta?.correo ?? "Cuenta"} ▾`}
        accessibilityLabel="Abrir el menú de la cuenta"
        onPress={() => setMenuCuenta((v) => !v)}
      />
    </>
  );

  const menu = menuCuenta ? (
    <>
      <MenuBackdrop onClose={() => setMenuCuenta(false)} />
      <Menu style={s.menuCuenta}>
        {enCurso ? <MenuNote>{`${nombreDelRol(enCurso.rol)} · ${enCurso.orgNombre}`}</MenuNote> : null}
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
      topBar={barra}
      overlay={menu}
      sidebar={
        <SideMenu
          accessibilityLabel="Secciones"
          items={SECCIONES.map((x) => ({ key: x.key, label: x.label }))}
          activeKey={activa}
          onSelect={(key) => {
            const destino = SECCIONES.find((x) => x.key === key);
            if (destino && destino.key !== activa) router.navigate(destino.ruta);
          }}
          collapsed={plegado}
          onToggleCollapsed={setPlegado}
        />
      }
    >
      {children}
    </AppShell>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    contexto: { flex: 1, minWidth: 0 },
    menuCuenta: { top: 56, right: t.space.xl },
  });
