/**
 * Las incidencias de un edificio: lo que se malogró, dónde, con qué
 * prioridad y en qué va.
 *
 * - Una pestaña por estado, con cuántas hay en cada una.
 * - En cada pestaña, lo urgente primero y, en la misma prioridad, lo que más
 *   espera. La prioridad va en palabra (y "Alta" con su signo), no solo en
 *   color.
 * - Cada incidencia lleva sus acciones según el estado: empezar, resolver o
 *   reabrir. Hecha una, sale de la pestaña y arriba queda dicho qué pasó.
 * - "Registrar incidencia" es el único botón primario de la vista.
 * - En una ventana angosta las acciones bajan debajo del texto.
 * - Con `propias` (el residente), se ven las de sus unidades y las de las
 *   áreas comunes, sin acciones; registra en una de sus unidades o en un
 *   área común.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { hoyEnLima, textoDeHace } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Badge, Button, Card, CardGrid, Dialog, EmptyState, PageHeader, Select, Tabs, TextField, textStyle, useStyles, useTheme, type StatusTone, type Tema } from "@/ui";

import type { IncidenciasPuerto, UnidadCorta } from "../application/ports";
import {
  accionesDeLaIncidencia,
  contarPorEstado,
  estadoTrasLaAccion,
  incidenciasVisibles,
  ordenarIncidencias,
  PRIORIDADES,
  TEXTO_DE_PRIORIDAD,
  validarIncidencia,
  type AccionDeIncidencia,
  type DatosDeIncidencia,
  type ErroresDeIncidencia,
  type EstadoDeIncidencia,
  type Incidencia,
  type Prioridad,
} from "../domain/incident";

const PESTANAS: { key: EstadoDeIncidencia; label: string }[] = [
  { key: "abierta", label: "Abiertas" },
  { key: "en_curso", label: "En curso" },
  { key: "resuelta", label: "Resueltas" },
];

const VACIO: Record<EstadoDeIncidencia, string> = {
  abierta: "No hay incidencias abiertas",
  en_curso: "No hay incidencias en curso",
  resuelta: "No hay incidencias resueltas",
};

const PRIORIDAD: Record<Prioridad, { tono: StatusTone; texto: string }> = {
  alta: { tono: "danger", texto: "! Alta" },
  media: { tono: "warning", texto: "Media" },
  baja: { tono: "neutral", texto: "Baja" },
};

const ACCION: Record<AccionDeIncidencia, { label: string; hecho: string }> = {
  empezar: { label: "Empezar", hecho: "pasó a En curso" },
  resolver: { label: "✓ Resolver", hecho: "quedó resuelta" },
  reabrir: { label: "Reabrir", hecho: "volvió a Abiertas" },
};

/** "Área común" es una opción más del lugar; su id no choca con el de una unidad. */
const AREA_COMUN = "area-comun";

export function PantallaIncidencias({
  incidencias,
  edificioId,
  propias,
}: {
  incidencias: IncidenciasPuerto;
  edificioId: string;
  /** Las unidades del residente en este edificio; sin esto, mira el equipo. */
  propias?: UnidadCorta[];
}) {
  const s = useStyles(makeStyles);
  const [estado, setEstado] = useState<EstadoDeIncidencia>("abierta");
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const leer = useCallback(() => incidencias.delEdificio(edificioId), [incidencias, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const hoy = hoyEnLima();

  const ids = propias ? new Set(propias.map((u) => u.id)) : null;
  const deQuienMira = carga.estado === "listo" ? incidenciasVisibles(carga.valor, ids) : [];
  const cuentas = carga.estado === "listo" ? contarPorEstado(deQuienMira) : null;
  const visibles = ordenarIncidencias(deQuienMira.filter((i) => i.estado === estado));

  async function actuar(i: Incidencia, accion: AccionDeIncidencia) {
    const r = await incidencias.cambiarEstado(i.id, estadoTrasLaAccion(accion));
    setAviso(r.ok ? { tono: "ok", texto: `"${i.titulo}" ${ACCION[accion].hecho}.` } : { tono: "error", texto: r.mensaje });
    reintentar();
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title="Incidencias"
        actions={<Button icon="plus" label="Registrar incidencia" onPress={() => setRegistrando(true)} testID="incidencias-registrar" />}
      />
      <Tabs
        accessibilityLabel="Estado de las incidencias"
        items={PESTANAS.map((p) => ({ ...p, count: cuentas?.[p.key] }))}
        value={estado}
        onChange={(e) => {
          setAviso(null);
          setEstado(e);
        }}
      />
      <LineaDeAviso aviso={aviso} />
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudieron leer las incidencias"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {carga.estado === "listo" && visibles.length === 0 ? <EmptyState icon="check-circle" title={VACIO[estado]} /> : null}
      {visibles.length > 0 ? (
        <CardGrid minItemWidth={480} gap="sm">
          {visibles.map((i) => (
            <FilaDeIncidencia key={i.id} incidencia={i} hoy={hoy} residente={propias !== undefined} onAccion={(a) => actuar(i, a)} />
          ))}
        </CardGrid>
      ) : null}
      {registrando ? (
        <Registro
          incidencias={incidencias}
          edificioId={edificioId}
          propias={ids}
          onCerrar={() => setRegistrando(false)}
          onHecho={(i) => {
            setRegistrando(false);
            setEstado("abierta");
            setAviso({ tono: "ok", texto: `Registrada "${i.titulo}".` });
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function FilaDeIncidencia({
  incidencia: i,
  hoy,
  residente,
  onAccion,
}: {
  incidencia: Incidencia;
  hoy: string;
  residente: boolean;
  onAccion: (a: AccionDeIncidencia) => Promise<void>;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [enCurso, setEnCurso] = useState<AccionDeIncidencia | null>(null);
  const lugar = i.unidadNumero ? `Unidad ${i.unidadNumero}` : "Área común";
  const cuando = i.estado === "resuelta" ? `resuelta ${textoDeHace(i.actualizadaEl, hoy)}` : `reportada ${textoDeHace(i.reportadaEl, hoy)}`;
  const acciones = accionesDeLaIncidencia(i.estado, residente);

  async function actuar(a: AccionDeIncidencia) {
    setEnCurso(a);
    await onAccion(a);
    setEnCurso(null);
  }

  return (
    <Card padding="md" style={s.fila}>
      <View style={s.texto}>
        <View style={s.cabeza}>
          <Badge tone={PRIORIDAD[i.prioridad].tono} label={PRIORIDAD[i.prioridad].texto} />
          <Text style={[textStyle(t, "body"), s.titulo]}>{i.titulo}</Text>
        </View>
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`${lugar} · ${cuando}`}</Text>
        {i.detalle ? <Text style={textStyle(t, "bodySmall")}>{i.detalle}</Text> : null}
      </View>
      {acciones.length > 0 ? (
        <View style={s.acciones}>
          {acciones.map((a, n) => (
            <Button
              key={a}
              size="sm"
              variant={n === 0 && a !== "reabrir" ? "secondary" : "ghost"}
              label={ACCION[a].label}
              accessibilityLabel={`${ACCION[a].label.replace("✓ ", "")}: ${i.titulo}`}
              loading={enCurso === a}
              disabled={enCurso !== null && enCurso !== a}
              onPress={() => actuar(a)}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Registro({
  incidencias,
  edificioId,
  propias,
  onCerrar,
  onHecho,
}: {
  incidencias: IncidenciasPuerto;
  edificioId: string;
  /** Las unidades del residente; `null`, el equipo registra en cualquiera. */
  propias: ReadonlySet<string> | null;
  onCerrar: () => void;
  onHecho: (i: Incidencia) => void;
}) {
  const [datos, setDatos] = useState<DatosDeIncidencia>({ titulo: "", unidadId: undefined, prioridad: undefined, detalle: "" });
  const [errores, setErrores] = useState<ErroresDeIncidencia>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const leer = useCallback(() => incidencias.unidades(edificioId), [incidencias, edificioId]);
  const { carga } = useCarga<UnidadCorta[]>(leer);
  const opciones = [
    { id: AREA_COMUN, label: "Área común" },
    ...(carga.estado === "listo"
      ? carga.valor.filter((u) => !propias || propias.has(u.id)).map((u) => ({ id: u.id, label: `Unidad ${u.numero}` }))
      : []),
  ];

  function cambiar<K extends keyof DatosDeIncidencia>(campo: K, valor: DatosDeIncidencia[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function registrar() {
    if (enviando) return;
    const e = validarIncidencia(datos);
    setErrores(e);
    if (Object.keys(e).length > 0 || !datos.prioridad || datos.unidadId === undefined) return;
    setEnviando(true);
    const r = await incidencias.registrar({
      edificioId,
      unidadId: datos.unidadId === AREA_COMUN ? null : datos.unidadId,
      titulo: datos.titulo.trim(),
      detalle: datos.detalle.trim() || null,
      prioridad: datos.prioridad,
    });
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Registrar incidencia"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Registrar" onPress={registrar} loading={enviando} testID="incidencias-guardar" />
        </>
      }
    >
      <TextField
        label="Qué pasó"
        required
        autoFocus
        value={datos.titulo}
        onChangeText={(v) => cambiar("titulo", v)}
        placeholder="Ej.: fuga de agua en el baño"
        error={errores.titulo}
      />
      <Select
        label="Dónde"
        required
        placeholder="Elige la unidad o el área común"
        accessibilityLabel="Dónde pasó"
        options={opciones}
        value={datos.unidadId}
        onChange={(id) => cambiar("unidadId", id)}
        error={errores.unidadId}
      />
      <CampoDeOpciones
        label="Prioridad"
        required
        options={PRIORIDADES.map((p) => ({ id: p, label: TEXTO_DE_PRIORIDAD[p] }))}
        value={datos.prioridad}
        onChange={(p) => cambiar("prioridad", p)}
        error={errores.prioridad}
        helper="Alta: no puede esperar a mañana."
      />
      <TextField label="Detalle" multiline value={datos.detalle} onChangeText={(v) => cambiar("detalle", v)} placeholder="Lo que ayude a quien lo va a atender" />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    // En pantalla ancha, dos incidencias por fila (`CardGrid`); en el teléfono, una.
    fila: { flexGrow: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    texto: { flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: t.space.xxs },
    cabeza: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    titulo: { fontWeight: "600", flexShrink: 1 },
    acciones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
  });
