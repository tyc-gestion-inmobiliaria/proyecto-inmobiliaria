/**
 * Los edificios de la administradora en curso (PB-07).
 *
 * - Lo que se ve sale de la tabla `edificio` por el puerto; nada más.
 * - Registrar y editar solo se ofrecen a quien la base deja escribir (el
 *   administrador). Los demás ven la lista sin botones que no les sirven.
 * - Un solo primario: arriba si ya hay edificios; si no, en el vacío.
 * - Cada fila abre las unidades del edificio, para todos los roles; editar
 *   el edificio se ofrece desde ahí al administrador.
 * - En una ventana angosta la fila apila nombre y dirección, para que la
 *   tabla quepa en 390 de ancho sin desplazarse de costado.
 */
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FlechaDeFila } from "@/compartido/ui/piezas";
import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  TableHead,
  TableRow,
  Td,
  TdView,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import type { EdificiosPuerto } from "../aplicacion/puertos";
import { puedeEditarEdificios, type Edificio } from "../dominio/edificio";
import { useEdificios } from "./usar-edificios";

/** Por debajo de este ancho de ventana, la fila apila sus datos. */
const ANCHO_ANGOSTO = 640;

export function PantallaEdificios({ edificios }: { edificios: EdificiosPuerto }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        // La clave descarta la lista anterior al cambiar de administradora.
        <ListaEdificios key={enCurso.orgId} orgId={enCurso.orgId} editable={puedeEditarEdificios(enCurso.rol)} puerto={edificios} />
      )}
    </ConOrganizacion>
  );
}

function ListaEdificios({ orgId, editable, puerto }: { orgId: string; editable: boolean; puerto: EdificiosPuerto }) {
  const s = useStyles(makeStyles);
  const { carga, reintentar } = useEdificios(puerto, orgId);
  const hayEdificios = carga.estado === "listo" && carga.edificios.length > 0;

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title="Edificios"
        actions={
          editable && hayEdificios ? (
            <Button icon="plus" label="Registrar edificio" onPress={() => router.push("/edificios/nuevo")} testID="edificios-registrar" />
          ) : null
        }
      />

      {carga.estado === "cargando" ? (
        <Cargando />
      ) : carga.estado === "error" ? (
        <EmptyState
          icon="refresh-cw"
          title="No se pudieron leer los edificios"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : carga.edificios.length === 0 ? (
        editable ? (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            action={
              <Button icon="plus" label="Registrar el primer edificio" onPress={() => router.push("/edificios/nuevo")} testID="edificios-registrar" />
            }
          />
        ) : (
          <EmptyState
            icon="building"
            title="Todavía no hay edificios registrados"
            description="Pide a un administrador de tu empresa que los registre."
          />
        )
      ) : (
        <Tabla edificios={carga.edificios} />
      )}
    </ScrollView>
  );
}

function Tabla({ edificios }: { edificios: Edificio[] }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const angosto = width < ANCHO_ANGOSTO;
  const abrir = (e: Edificio) => () => router.push({ pathname: "/edificios/[id]/unidades", params: { id: e.id } });
  // La flecha dice que la fila se abre sin tener que pasar el puntero.
  const flecha = (
    <View style={s.flecha}>
      <FlechaDeFila texto="Unidades" />
    </View>
  );
  const marca = (
    <View style={s.marca}>
      <Icon name="building" size="sm" color={t.color.accent.text} />
    </View>
  );

  if (angosto) {
    return (
      <DataTable minWidth={0}>
        {edificios.map((e) => (
          <TableRow key={e.id} onPress={abrir(e)} accessibilityLabel={`Ver las unidades de ${e.nombre}`}>
            {marca}
            <TdView flex={1}>
              <Text style={[textStyle(t, "body"), s.nombre]}>{e.nombre}</Text>
              {e.direccion ? <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{e.direccion}</Text> : null}
            </TdView>
            {flecha}
          </TableRow>
        ))}
      </DataTable>
    );
  }

  return (
    <DataTable minWidth={560}>
      <TableHead>
        <View style={s.marcaHueco} />
        <Th flex={2}>Nombre</Th>
        <Th flex={3}>Dirección</Th>
        <View style={s.flecha} />
      </TableHead>
      {edificios.map((e) => (
        <TableRow key={e.id} onPress={abrir(e)} accessibilityLabel={`Ver las unidades de ${e.nombre}`}>
          {marca}
          <Td flex={2} style={s.nombre}>
            {e.nombre}
          </Td>
          <Td flex={3} muted>
            {e.direccion ?? "—"}
          </Td>
          {flecha}
        </TableRow>
      ))}
    </DataTable>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 960, width: "100%" },
    flecha: { width: 96 },
    nombre: { fontWeight: "600" },
    marca: {
      width: 32,
      height: 32,
      borderRadius: t.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.color.accent.subtle,
    },
    marcaHueco: { width: 32 },
  });
