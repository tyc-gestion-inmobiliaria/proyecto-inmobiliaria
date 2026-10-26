/**
 * El mantenimiento de un edificio: el cronograma de tareas y los equipos con
 * su proveedor.
 *
 * - El cronograma va por fecha: lo vencido primero ("! Vencida hace 3
 *   días"), luego lo que vence en los próximos días y lo demás. Cada tarea
 *   lleva quién la hace y cómo llamarlo. Sin resumen arriba: lo vencido ya
 *   encabeza la lista, con su signo y su palabra.
 * - "Programar tarea" es el único primario: suma una tarea al cronograma de
 *   un equipo del edificio.
 * - "✓ Marcar hecha" es una acción por fila: la marca hecha hoy y dice
 *   cuándo toca la siguiente.
 * - Equipos y proveedores: en tabla en una ventana ancha; apilados en el
 *   teléfono.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { hoyEnLima, textoDeFecha } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  PageHeader,
  Select,
  SectionTitle,
  TableHead,
  TableRow,
  Td,
  TextField,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { DelEdificio, MantenimientoPuerto } from "../application/ports";
import {
  DIAS_DE_AVISO,
  diasParaLaTarea,
  estadoDeLaTarea,
  FRECUENCIAS,
  ordenarCronograma,
  textoDeFrecuencia,
  validarTarea,
  type DatosDeTarea,
  type Equipo,
  type ErroresDeTarea,
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
  const [programando, setProgramando] = useState(false);
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
      <PageHeader
        title="Mantenimiento"
        actions={
          carga.estado === "listo" && carga.valor.equipos.length > 0 ? (
            <Button icon="plus" label="Programar tarea" onPress={() => setProgramando(true)} testID="mantenimiento-programar" />
          ) : undefined
        }
      />
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
      {programando && carga.estado === "listo" ? (
        <Programar
          mantenimiento={mantenimiento}
          edificioId={edificioId}
          equipos={carga.valor.equipos}
          hoy={hoy}
          onCerrar={() => setProgramando(false)}
          onHecho={(tarea, equipo) => {
            setProgramando(false);
            setAviso({ tono: "ok", texto: `${equipo}: "${tarea.tarea}" programada para el ${textoDeFecha(tarea.proxima)}.` });
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function Contenido({ datos, hoy, onHecha }: { datos: DelEdificio; hoy: string; onHecha: (t: TareaDeMantenimiento, equipo: string) => Promise<void> }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;
  const equipo = (id: string) => datos.equipos.find((q) => q.id === id);
  const proveedor = (id: string | null) => datos.proveedores.find((p) => p.id === id);

  if (datos.equipos.length === 0) return <EmptyState icon="gauge" title="Este edificio no tiene equipos registrados" />;

  return (
    <>
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

function Programar({
  mantenimiento,
  edificioId,
  equipos,
  hoy,
  onCerrar,
  onHecho,
}: {
  mantenimiento: MantenimientoPuerto;
  edificioId: string;
  equipos: Equipo[];
  hoy: string;
  onCerrar: () => void;
  onHecho: (tarea: TareaDeMantenimiento, equipo: string) => void;
}) {
  const [datos, setDatos] = useState<DatosDeTarea>({ equipoId: undefined, tarea: "", frecuenciaMeses: undefined, proxima: "" });
  const [errores, setErrores] = useState<ErroresDeTarea>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiar<K extends keyof DatosDeTarea>(campo: K, valor: DatosDeTarea[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function programar() {
    if (enviando) return;
    const v = validarTarea(datos, hoy);
    if (!v.ok) {
      setErrores(v.errores);
      return;
    }
    setEnviando(true);
    const r = await mantenimiento.programar({ edificioId, ...v.tarea });
    setEnviando(false);
    if (r.ok) onHecho(r.valor, equipos.find((q) => q.id === r.valor.equipoId)?.nombre ?? "Equipo");
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Programar tarea"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Programar" onPress={programar} loading={enviando} testID="mantenimiento-guardar" />
        </>
      }
    >
      <Select
        label="Equipo"
        required
        placeholder="Elige el equipo"
        accessibilityLabel="Equipo"
        options={equipos.map((q) => ({ id: q.id, label: q.nombre, detail: q.ubicacion }))}
        value={datos.equipoId}
        onChange={(id) => cambiar("equipoId", id)}
        error={errores.equipoId}
      />
      <TextField
        label="Qué hay que hacer"
        required
        value={datos.tarea}
        onChangeText={(v) => cambiar("tarea", v)}
        placeholder="Ej.: revisión y engrase"
        error={errores.tarea}
      />
      <CampoDeOpciones
        label="Cada cuánto"
        required
        options={FRECUENCIAS.map((f) => ({ id: String(f), label: textoDeFrecuencia(f) }))}
        value={datos.frecuenciaMeses ? String(datos.frecuenciaMeses) : undefined}
        onChange={(f) => cambiar("frecuenciaMeses", f ? Number(f) : undefined)}
        error={errores.frecuenciaMeses}
      />
      <TextField
        label="Primera vez"
        required
        value={datos.proxima}
        onChangeText={(v) => cambiar("proxima", v)}
        placeholder="dd/mm/aaaa"
        error={errores.proxima}
      />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
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
