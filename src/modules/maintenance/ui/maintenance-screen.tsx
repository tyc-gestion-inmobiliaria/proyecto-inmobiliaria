/**
 * El mantenimiento de un edificio: el cronograma de tareas y los equipos con
 * su proveedor.
 *
 * - Arriba, cuántas tareas están vencidas y cuántas vencen pronto, en
 *   palabras y con su signo.
 * - El cronograma va por fecha: lo vencido primero ("! Vencida hace 3
 *   días"), luego lo que vence en los próximos días y lo demás. Cada tarea
 *   lleva quién la hace y cómo llamarlo.
 * - "✓ Marcar hecha" es una acción por fila (no hay primario en la vista):
 *   la marca hecha hoy y dice cuándo toca la siguiente.
 * - Equipos y proveedores: en tabla en una ventana ancha; apilados en el
 *   teléfono.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { useCarga } from "@/shared/ui/use-load";
import { hoyEnLima, textoDeFecha } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusDot,
  TableHead,
  TableRow,
  Td,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { DelEdificio, MantenimientoPuerto } from "../application/ports";
import {
  contarPorEstado,
  DIAS_DE_AVISO,
  diasParaLaTarea,
  estadoDeLaTarea,
  ordenarCronograma,
  textoDeFrecuencia,
  type EstadoDeTarea,
  type TareaDeMantenimiento,
} from "../domain/maintenance";

const ANCHO_ANGOSTO = 720;

const TONO: Record<EstadoDeTarea, StatusTone> = { vencida: "danger", por_vencer: "warning", al_dia: "neutral" };

function textoDelPlazo(t: TareaDeMantenimiento, hoy: string): string {
  const n = diasParaLaTarea(t, hoy);
  if (n < 0) return `! Vencida hace ${-n} ${n === -1 ? "día" : "días"}`;
  if (n === 0) return "Toca hoy";
  if (n === 1) return "Mañana";
  if (n <= DIAS_DE_AVISO) return `En ${n} días`;
  return textoDeFecha(t.proxima);
}

export function PantallaMantenimiento({ mantenimiento, edificioId }: { mantenimiento: MantenimientoPuerto; edificioId: string }) {
  const s = useStyles(makeStyles);
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const leer = useCallback(() => mantenimiento.delEdificio(edificioId), [mantenimiento, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const hoy = hoyEnLima();

  async function hecha(t: TareaDeMantenimiento, equipo: string) {
    const r = await mantenimiento.marcarHecha(t.id);
    setAviso(
      r.ok
        ? { tono: "ok", texto: `${equipo}: "${t.tarea}" hecha hoy. La siguiente toca el ${textoDeFecha(r.valor.proxima)}.` }
        : { tono: "error", texto: r.mensaje },
    );
    reintentar();
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader title="Mantenimiento" />
      <LineaDeAviso aviso={aviso} />
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudo leer el mantenimiento"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {carga.estado === "listo" ? <Contenido datos={carga.valor} hoy={hoy} onHecha={hecha} /> : null}
    </ScrollView>
  );
}

function Contenido({ datos, hoy, onHecha }: { datos: DelEdificio; hoy: string; onHecha: (t: TareaDeMantenimiento, equipo: string) => Promise<void> }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;
  const cuenta = contarPorEstado(datos.tareas, hoy);
  const equipo = (id: string) => datos.equipos.find((q) => q.id === id);
  const proveedor = (id: string | null) => datos.proveedores.find((p) => p.id === id);

  if (datos.equipos.length === 0) return <EmptyState icon="gauge" title="Este edificio no tiene equipos registrados" />;

  return (
    <>
      <View style={s.resumen}>
        {cuenta.vencida > 0 ? <StatusDot tone="danger" label={`! ${cuenta.vencida} ${cuenta.vencida === 1 ? "vencida" : "vencidas"}`} /> : null}
        {cuenta.por_vencer > 0 ? <StatusDot tone="warning" label={`${cuenta.por_vencer} en los próximos ${DIAS_DE_AVISO} días`} /> : null}
        {cuenta.vencida === 0 && cuenta.por_vencer === 0 ? <StatusDot tone="success" label="✓ Todo al día" /> : null}
      </View>

      <View style={s.seccion}>
        <SectionTitle>Cronograma</SectionTitle>
        <Card padding="md" style={s.lista}>
          {ordenarCronograma(datos.tareas).map((tarea, i) => {
            const q = equipo(tarea.equipoId);
            const p = proveedor(q?.proveedorId ?? null);
            const estado = estadoDeLaTarea(tarea, hoy);
            return (
              <FilaDeTarea
                key={tarea.id}
                primera={i === 0}
                titulo={q?.nombre ?? "Equipo"}
                tarea={tarea}
                detalle={[textoDeFrecuencia(tarea.frecuenciaMeses), p ? (p.telefono ? `${p.nombre} · ${p.telefono}` : p.nombre) : "Sin proveedor"].join(" · ")}
                plazo={textoDelPlazo(tarea, hoy)}
                tono={TONO[estado]}
                destacar={estado !== "al_dia"}
                onHecha={() => onHecha(tarea, q?.nombre ?? "Equipo")}
              />
            );
          })}
        </Card>
      </View>

      <View style={s.seccion}>
        <SectionTitle>Equipos y proveedores</SectionTitle>
        {angosto ? (
          <Card padding="md" style={s.lista}>
            {datos.equipos.map((q, i) => {
              const p = proveedor(q.proveedorId);
              return (
                <View key={q.id} style={[s.equipo, i === 0 && s.primera]}>
                  <Text style={[textStyle(t, "body"), s.fuerte]}>{q.nombre}</Text>
                  <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{q.ubicacion}</Text>
                  <Text style={textStyle(t, "bodySmall")}>{p ? [p.nombre, p.rubro, p.telefono].filter(Boolean).join(" · ") : "Sin proveedor"}</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <DataTable minWidth={0}>
            <TableHead>
              <Th flex={2}>Equipo</Th>
              <Th flex={2}>Ubicación</Th>
              <Th flex={2}>Proveedor</Th>
              <Th flex={1}>Teléfono</Th>
            </TableHead>
            {datos.equipos.map((q) => {
              const p = proveedor(q.proveedorId);
              return (
                <TableRow key={q.id}>
                  <Td flex={2}>{q.nombre}</Td>
                  <Td flex={2} muted>
                    {q.ubicacion}
                  </Td>
                  <Td flex={2}>{p ? `${p.nombre} (${p.rubro})` : "Sin proveedor"}</Td>
                  <Td flex={1} mono muted>
                    {p?.telefono ?? "—"}
                  </Td>
                </TableRow>
              );
            })}
          </DataTable>
        )}
      </View>
    </>
  );
}

function FilaDeTarea({
  primera,
  titulo,
  tarea,
  detalle,
  plazo,
  tono,
  destacar,
  onHecha,
}: {
  primera: boolean;
  titulo: string;
  tarea: TareaDeMantenimiento;
  detalle: string;
  plazo: string;
  tono: StatusTone;
  destacar: boolean;
  onHecha: () => Promise<void>;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [enCurso, setEnCurso] = useState(false);

  async function marcar() {
    setEnCurso(true);
    await onHecha();
    setEnCurso(false);
  }

  return (
    <View style={[s.fila, primera && s.primera]}>
      <View style={s.texto}>
        <View style={s.cabeza}>
          <Text style={[textStyle(t, "body"), s.fuerte]}>{`${titulo} · ${tarea.tarea}`}</Text>
        </View>
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{detalle}</Text>
        {tarea.ultima ? <Text style={textStyle(t, "caption", t.color.text.secondary)}>{`Última vez: ${textoDeFecha(tarea.ultima)}`}</Text> : null}
      </View>
      <View style={s.lado}>
        {destacar ? <Badge tone={tono} label={plazo} /> : <Text style={textStyle(t, "data", t.color.text.secondary)}>{plazo}</Text>}
        <Button size="sm" variant="secondary" label="✓ Marcar hecha" accessibilityLabel={`Marcar hecha: ${titulo}, ${tarea.tarea}`} loading={enCurso} onPress={marcar} />
      </View>
    </View>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    resumen: { flexDirection: "row", flexWrap: "wrap", columnGap: t.space.lg, rowGap: t.space.xs },
    seccion: { gap: t.space.md },
    lista: { paddingVertical: t.space.xs },
    fila: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: t.space.md,
      rowGap: t.space.sm,
      paddingVertical: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    primera: { borderTopWidth: 0 },
    texto: { flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: t.space.xxs },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    lado: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md, marginLeft: "auto" },
    fuerte: { fontWeight: "600" },
    equipo: { gap: t.space.xxs, paddingVertical: t.space.sm, borderTopWidth: 1, borderTopColor: t.color.border.subtle },
  });
