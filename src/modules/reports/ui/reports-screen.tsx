/**
 * Los reportes: elegir uno y ver su tabla.
 *
 * - A un lado (arriba, en el teléfono), los reportes disponibles, cada uno
 *   con lo que responde; el elegido lleva ✓ y su fondo. Al lado, su tabla.
 * - Respeta el selector de contexto: en toda la cartera, una fila por
 *   edificio; con un edificio elegido, una fila por unidad o por pago.
 * - La tabla llega calculada (con base, la calcularía el servidor). En el
 *   teléfono cada fila es una ficha con sus datos, para no desplazar de
 *   costado.
 * - Los números van alineados a la derecha y con cifras tabulares; la fila
 *   de totales va al pie, en negrita.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useContextoDeTrabajo } from "@/shared/context/context-provider";
import { useCarga } from "@/shared/ui/use-load";
import { textoDeFecha, textoDeSoles } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  KeyValueRow,
  PageHeader,
  SectionTitle,
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

import type { ReportesPuerto } from "../application/ports";
import { REPORTES, type Celda, type Columna, type ReporteId, type TablaDeReporte } from "../domain/reports";

const ANCHO_ANGOSTO = 720;
const ANCHO_DOS_COLUMNAS = 960;

const VACIO: Record<ReporteId, string> = {
  recaudacion: "No hay recibos emitidos este mes",
  morosidad: "No hay unidades con deuda vencida",
  "por-validar": "No hay pagos por validar",
};

const PORCENTAJE = new Intl.NumberFormat("es-PE", { style: "percent", maximumFractionDigits: 0 });

function texto(c: Celda, col: Columna): string {
  if (c === null || c === undefined) return "—";
  switch (col.tipo) {
    case "soles":
      return textoDeSoles(Number(c));
    case "porcentaje":
      return PORCENTAJE.format(Number(c));
    case "fecha":
      return textoDeFecha(String(c));
    default:
      return String(c);
  }
}

export function PantallaReportes({ reportes }: { reportes: ReportesPuerto }) {
  const s = useStyles(makeStyles);
  const { edificio } = useContextoDeTrabajo();
  const ancho = useWindowDimensions().width;
  const [elegido, setElegido] = useState<ReporteId>("recaudacion");
  const edificioId = edificio?.id ?? null;
  const leer = useCallback(() => reportes.generar(elegido, edificioId), [reportes, elegido, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const reporte = REPORTES.find((r) => r.id === elegido) ?? REPORTES[0];
  const dosColumnas = ancho >= ANCHO_DOS_COLUMNAS;

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader title="Reportes" />
      <View style={dosColumnas ? s.dosColumnas : s.columna}>
        <View style={dosColumnas ? s.colLista : undefined}>
          <DataTable minWidth={0}>
            {REPORTES.map((r) => {
              const activo = r.id === elegido;
              return (
                <TableRow key={r.id} selected={activo} onPress={() => setElegido(r.id)} accessibilityLabel={`${r.nombre}: ${r.pregunta}`}>
                  <TdView flex={1} style={s.opcion}>
                    <Opcion nombre={r.nombre} pregunta={r.pregunta} activo={activo} />
                  </TdView>
                </TableRow>
              );
            })}
          </DataTable>
        </View>
        <View style={[s.columna, dosColumnas ? s.colTabla : undefined]}>
          <SectionTitle>{edificio ? `${reporte.nombre} · ${edificio.nombre}` : reporte.nombre}</SectionTitle>
          {carga.estado === "cargando" ? <Cargando /> : null}
          {carga.estado === "error" ? (
            <EmptyState
              title="No se pudo armar el reporte"
              description="Revisa tu conexión y vuelve a intentarlo."
              action={<Button label="Reintentar" onPress={reintentar} />}
            />
          ) : null}
          {carga.estado === "listo" ? (
            carga.valor.filas.length === 0 ? (
              <EmptyState icon="check-circle" title={VACIO[elegido]} />
            ) : (
              <Tabla tabla={carga.valor} angosto={ancho < ANCHO_ANGOSTO} />
            )
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Opcion({ nombre, pregunta, activo }: { nombre: string; pregunta: string; activo: boolean }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.textoOpcion}>
        <Text style={[textStyle(t, "body"), activo && s.fuerte]}>{nombre}</Text>
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{pregunta}</Text>
      </View>
      {activo ? <Icon name="check" size="sm" color={t.color.accent.text} /> : null}
    </>
  );
}

function Tabla({ tabla, angosto }: { tabla: TablaDeReporte; angosto: boolean }) {
  const s = useStyles(makeStyles);
  if (angosto) return <Apilada tabla={tabla} />;
  const flex = (c: Columna, i: number) => (i === 0 ? 2 : c.tipo === "soles" ? 2 : 1);
  const derecha = (c: Columna) => c.tipo !== "texto";
  return (
    <DataTable minWidth={0}>
      <TableHead>
        {tabla.columnas.map((c, i) => (
          <Th key={c.clave} flex={flex(c, i)} align={derecha(c) ? "right" : undefined}>
            {c.titulo}
          </Th>
        ))}
      </TableHead>
      {tabla.filas.map((f, n) => (
        <TableRow key={n}>
          {tabla.columnas.map((c, i) => (
            <Td key={c.clave} flex={flex(c, i)} mono={derecha(c)} align={derecha(c) ? "right" : undefined}>
              {texto(f[c.clave], c)}
            </Td>
          ))}
        </TableRow>
      ))}
      {tabla.total ? (
        <TableRow>
          {tabla.columnas.map((c, i) => (
            <Td key={c.clave} flex={flex(c, i)} mono={derecha(c)} align={derecha(c) ? "right" : undefined} style={s.fuerte}>
              {tabla.total?.[c.clave] === null && i > 0 ? "" : texto(tabla.total?.[c.clave] ?? null, c)}
            </Td>
          ))}
        </TableRow>
      ) : null}
    </DataTable>
  );
}

/** En el teléfono, una tarjeta por fila: la primera columna de título y las demás como dato y valor. */
function Apilada({ tabla }: { tabla: TablaDeReporte }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [primera, ...resto] = tabla.columnas;
  const filas = tabla.total ? [...tabla.filas, tabla.total] : tabla.filas;
  return (
    <View style={s.apilada}>
      {filas.map((f, n) => {
        const esTotal = tabla.total !== null && n === filas.length - 1;
        return (
          <Card key={n} padding="md" style={s.ficha}>
            <Text style={[textStyle(t, "body"), s.fuerte]}>{texto(f[primera.clave], primera)}</Text>
            {resto
              .filter((c) => !(esTotal && f[c.clave] === null))
              .map((c) => (
                <KeyValueRow key={c.clave} label={c.titulo} value={texto(f[c.clave], c)} strong={esTotal} />
              ))}
          </Card>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    columna: { gap: t.space.lg },
    dosColumnas: { flexDirection: "row", alignItems: "flex-start", gap: t.space.xl },
    colLista: { flexBasis: 300, flexGrow: 0, flexShrink: 0 },
    colTabla: { flex: 1, minWidth: 0 },
    opcion: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    textoOpcion: { flex: 1, minWidth: 0, gap: t.space.xxs },
    fuerte: { fontWeight: "700" },
    apilada: { gap: t.space.sm },
    ficha: { gap: t.space.xxs },
  });
