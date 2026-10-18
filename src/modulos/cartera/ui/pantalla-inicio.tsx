/**
 * Lo que se ve al entrar: la cartera de la administradora (PB-11).
 *
 * - **Toda la cartera:** una fila por edificio con sus unidades, si la
 *   participación suma 100 %, si tiene cuenta bancaria y el siguiente paso
 *   (H1: la causa y qué hacer). Tocar la fila elige ese edificio en el
 *   selector de contexto, que es "ir al edificio" (PB-10).
 * - **Un edificio elegido:** el mismo estado, con sus pendientes enteros.
 * - **Indicadores solo con datos (H8):** los que no tienen nada que contar no
 *   se arman. Recaudación, morosidad, incidencias y reservas no existen en la
 *   base todavía y no se muestran.
 * - **Sin edificios:** el vacío con "Registrar edificio" para quien puede
 *   registrarlos; a los demás, a quién pedírselo.
 * - En una ventana angosta la fila apila sus datos, para caber en 390 de
 *   ancho sin desplazarse de costado.
 */
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useContextoDeTrabajo } from "@/compartido/contexto/proveedor-contexto";
import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import type { EdificiosPuerto } from "@/modulos/padron/aplicacion/puertos";
import { puedeEditarEdificios } from "@/modulos/padron/dominio/edificio";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KeyValueRow,
  ScreenTitle,
  SectionTitle,
  StatTile,
  StatusDot,
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

import type { EstadoDeLaCarteraPuerto } from "../aplicacion/puertos";
import { formatoPorcentaje, indicadoresDeLaCartera, type FilaCartera, type Pendiente } from "../dominio/cartera";
import { useCartera } from "./usar-cartera";

/** Por debajo de este ancho de ventana, la fila apila sus datos. */
const ANCHO_ANGOSTO = 720;

const LISTO = "Listo para cobrar";

function unidades(n: number): string {
  return `${n} ${n === 1 ? "unidad" : "unidades"}`;
}

export function PantallaInicio({ edificios, estado }: { edificios: EdificiosPuerto; estado: EstadoDeLaCarteraPuerto }) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        // La clave descarta la cartera anterior al cambiar de administradora.
        <Cartera
          key={enCurso.orgId}
          orgId={enCurso.orgId}
          orgNombre={enCurso.orgNombre}
          editable={puedeEditarEdificios(enCurso.rol)}
          edificios={edificios}
          estado={estado}
        />
      )}
    </ConOrganizacion>
  );
}

function Cartera({
  orgId,
  orgNombre,
  editable,
  edificios,
  estado,
}: {
  orgId: string;
  orgNombre: string;
  editable: boolean;
  edificios: EdificiosPuerto;
  estado: EstadoDeLaCarteraPuerto;
}) {
  const s = useStyles(makeStyles);
  const { edificio, elegirEdificio } = useContextoDeTrabajo();
  const { carga, reintentar } = useCartera(edificios, estado, orgId);

  let contenido;
  if (carga.estado === "cargando") {
    contenido = <Cargando />;
  } else if (carga.estado === "error") {
    contenido = (
      <EmptyState
        title="No se pudo leer la cartera"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (edificio) {
    const fila = carga.filas.find((f) => f.id === edificio.id);
    contenido = fila ? (
      <DelEdificio fila={fila} />
    ) : (
      <EmptyState
        title="No se encontró el edificio"
        action={<Button variant="secondary" label="Ver toda la cartera" onPress={() => elegirEdificio(null)} />}
      />
    );
  } else if (carga.filas.length === 0) {
    contenido = editable ? (
      <EmptyState
        title="Todavía no hay edificios registrados"
        action={<Button label="Registrar edificio" onPress={() => router.push("/edificios/nuevo")} testID="inicio-registrar" />}
      />
    ) : (
      <EmptyState title="Todavía no hay edificios registrados" description="Pide a un administrador de tu empresa que los registre." />
    );
  } else {
    contenido = <DeLaCartera filas={carga.filas} abrir={elegirEdificio} />;
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <ScreenTitle>{edificio ? edificio.nombre : orgNombre}</ScreenTitle>
      {contenido}
    </ScrollView>
  );
}

function DeLaCartera({ filas, abrir }: { filas: FilaCartera[]; abrir: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const indicadores = indicadoresDeLaCartera(filas);
  return (
    <>
      {indicadores.length > 0 ? (
        <View style={s.indicadores}>
          {indicadores.map((i) => (
            <StatTile key={i.clave} label={i.etiqueta} value={String(i.valor)} />
          ))}
        </View>
      ) : null}
      <Tabla filas={filas} abrir={abrir} />
    </>
  );
}

function etiquetaDeFila(f: FilaCartera): string {
  const estado = f.pendientes.length === 0 ? LISTO : f.pendientes.map((p) => `${p.causa}: ${p.paso}`).join(". ");
  return `${f.nombre}, ${unidades(f.unidades)}. ${estado}`;
}

function Tabla({ filas, abrir }: { filas: FilaCartera[]; abrir: (id: string) => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  // La flecha dice que la fila se abre sin tener que pasar el puntero.
  const flecha = (
    <Text aria-hidden style={[textStyle(t, "label", t.color.accent.text), s.flecha]}>
      ›
    </Text>
  );

  if (width < ANCHO_ANGOSTO) {
    return (
      <DataTable minWidth={0}>
        {filas.map((f) => (
          <TableRow key={f.id} onPress={() => abrir(f.id)} accessibilityLabel={etiquetaDeFila(f)}>
            <TdView flex={1} style={s.apilada}>
              <Text style={[textStyle(t, "body"), s.fuerte]}>{f.nombre}</Text>
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                {unidades(f.unidades)}
                {f.participacion ? ` · participación ${formatoPorcentaje(f.participacion.total)}` : ""}
              </Text>
              <SiguientePaso pendientes={f.pendientes} />
            </TdView>
            {flecha}
          </TableRow>
        ))}
      </DataTable>
    );
  }

  return (
    <DataTable minWidth={640}>
      <TableHead>
        <Th flex={2}>Edificio</Th>
        <Th flex={1} align="right">
          Unidades
        </Th>
        <Th flex={1.2}>Participación</Th>
        <Th flex={1}>Cuenta</Th>
        <Th flex={2.4}>Siguiente paso</Th>
        <View style={s.flecha} />
      </TableHead>
      {filas.map((f) => (
        <TableRow key={f.id} onPress={() => abrir(f.id)} accessibilityLabel={etiquetaDeFila(f)}>
          <Td flex={2}>{f.nombre}</Td>
          <Td flex={1} mono align="right">
            {f.unidades}
          </Td>
          <TdView flex={1.2}>
            {f.participacion ? (
              <StatusDot tone={f.participacion.sumaCien ? "success" : "warning"} label={formatoPorcentaje(f.participacion.total)} />
            ) : (
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>—</Text>
            )}
          </TdView>
          <TdView flex={1}>
            <StatusDot tone={f.tieneCuenta ? "success" : "warning"} label={f.tieneCuenta ? "Registrada" : "Falta"} />
          </TdView>
          <TdView flex={2.4}>
            <SiguientePaso pendientes={f.pendientes} />
          </TdView>
          {flecha}
        </TableRow>
      ))}
    </DataTable>
  );
}

/** El primer pendiente con su paso y su causa; si hay más, cuántos. */
function SiguientePaso({ pendientes }: { pendientes: Pendiente[] }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [primero, ...resto] = pendientes;
  if (!primero) return <StatusDot tone="success" label={LISTO} />;
  return (
    <View style={s.paso}>
      <Text style={[textStyle(t, "bodySmall"), s.fuerte]}>{primero.paso}</Text>
      <StatusDot tone="warning" label={primero.causa} />
      {resto.length > 0 ? (
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>
          y {resto.length} {resto.length === 1 ? "pendiente más" : "pendientes más"}
        </Text>
      ) : null}
    </View>
  );
}

function DelEdificio({ fila }: { fila: FilaCartera }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <>
      <Card style={s.ficha}>
        <KeyValueRow label="Unidades" value={String(fila.unidades)} />
        {fila.participacion ? <KeyValueRow label="Participación" value={formatoPorcentaje(fila.participacion.total)} /> : null}
        <KeyValueRow label="Cuenta bancaria" value={fila.tieneCuenta ? "Registrada" : "Falta"} />
      </Card>
      {fila.pendientes.length === 0 ? (
        <StatusDot tone="success" label={LISTO} />
      ) : (
        <View style={s.pendientes}>
          <SectionTitle>Pendientes</SectionTitle>
          {fila.pendientes.map((p) => (
            <Card key={p.tipo} style={s.pendiente}>
              <Text style={[textStyle(t, "body"), s.fuerte]}>{p.paso}</Text>
              <StatusDot tone="warning" label={p.causa} />
            </Card>
          ))}
        </View>
      )}
    </>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    indicadores: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    apilada: { gap: t.space.xs },
    paso: { gap: t.space.xxs },
    fuerte: { fontWeight: "600" },
    flecha: { width: 32, textAlign: "right" },
    ficha: { maxWidth: 420, gap: t.space.sm },
    pendientes: { gap: t.space.md, maxWidth: 560 },
    pendiente: { gap: t.space.xs },
  });
