/**
 * Las reservas de las áreas comunes de un edificio.
 *
 * - Arriba, el filtro por área; debajo, las reservas de hoy en adelante
 *   agrupadas por día, cada una con su turno, su área, la unidad y su estado
 *   en palabra. Las canceladas van en su pestaña.
 * - Una pendiente se confirma o se cancela; una confirmada, se cancela
 *   (pidiendo confirmación, porque avisa a la unidad).
 * - "Nueva reserva" es el único botón primario. Al elegir una unidad con
 *   deuda vencida, el aviso aparece junto al campo antes de enviar (supuesto
 *   de negocio: solo reservan las unidades al día; ver el dominio).
 * - Los turnos ya tomados se ven en la lista, apagados y con la palabra
 *   "ocupado".
 */
import { useCallback, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { diasEntre, hoyEnLima, textoDeDia } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import {
  Badge,
  Button,
  Card,
  ChoiceChips,
  ConfirmButton,
  Dialog,
  EmptyState,
  PageHeader,
  Select,
  Tabs,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import type { ReservasPuerto, UnidadParaReservar } from "../application/ports";
import {
  accionesDeLaReserva,
  avisoDeLaUnidad,
  diasReservables,
  estadoTrasLaAccion,
  HORARIO_DEL_TURNO,
  porDia,
  proximas,
  TEXTO_DEL_ESTADO,
  TEXTO_DEL_TURNO,
  TURNOS,
  turnosOcupados,
  validarReserva,
  type AccionDeReserva,
  type AreaComun,
  type DatosDeReserva,
  type ErroresDeReserva,
  type EstadoDeReserva,
  type Reserva,
} from "../domain/reservation";

type Pestana = "proximas" | "canceladas";

const ESTADO: Record<EstadoDeReserva, { tono: StatusTone; texto: string }> = {
  pendiente: { tono: "warning", texto: TEXTO_DEL_ESTADO.pendiente },
  confirmada: { tono: "success", texto: `✓ ${TEXTO_DEL_ESTADO.confirmada}` },
  cancelada: { tono: "neutral", texto: TEXTO_DEL_ESTADO.cancelada },
};

interface Datos {
  areas: AreaComun[];
  reservas: Reserva[];
}

function textoDelDia(fecha: string, hoy: string): string {
  const n = diasEntre(hoy, fecha);
  const dia = textoDeDia(fecha);
  return n === 0 ? `Hoy · ${dia}` : n === 1 ? `Mañana · ${dia}` : dia;
}

export function PantallaReservas({ reservas, edificioId }: { reservas: ReservasPuerto; edificioId: string }) {
  const s = useStyles(makeStyles);
  const [pestana, setPestana] = useState<Pestana>("proximas");
  const [area, setArea] = useState<string | undefined>(undefined);
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const [reservando, setReservando] = useState(false);
  const leer = useCallback(
    async (): Promise<Datos> => {
      const [areas, lista] = await Promise.all([reservas.areas(edificioId), reservas.delEdificio(edificioId)]);
      return { areas, reservas: lista };
    },
    [reservas, edificioId],
  );
  const { carga, reintentar } = useCarga(leer);
  const hoy = hoyEnLima();

  const datos = carga.estado === "listo" ? carga.valor : null;
  const futuras = datos ? proximas(datos.reservas, hoy).filter((r) => !area || r.areaId === area) : [];
  const vigentes = futuras.filter((r) => r.estado !== "cancelada");
  const canceladas = futuras.filter((r) => r.estado === "cancelada");
  const visibles = pestana === "proximas" ? vigentes : canceladas;
  const nombreDelArea = (id: string) => datos?.areas.find((a) => a.id === id)?.nombre ?? "Área";

  async function actuar(r: Reserva, accion: AccionDeReserva) {
    const res = await reservas.cambiarEstado(r.id, estadoTrasLaAccion(accion));
    const que = `${nombreDelArea(r.areaId)}, ${textoDeDia(r.fecha)} (${TEXTO_DEL_TURNO[r.turno].toLowerCase()}), unidad ${r.unidadNumero}`;
    setAviso(res.ok ? { tono: "ok", texto: `${accion === "confirmar" ? "Confirmada" : "Cancelada"}: ${que}.` } : { tono: "error", texto: res.mensaje });
    reintentar();
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader title="Reservas" actions={<Button icon="plus" label="Nueva reserva" onPress={() => setReservando(true)} testID="reservas-nueva" />} />
      {datos && datos.areas.length > 0 ? (
        <ChoiceChips
          accessibilityLabel="Filtrar por área"
          clearable
          options={datos.areas.map((a) => ({ id: a.id, label: a.nombre }))}
          value={area}
          onChange={setArea}
        />
      ) : null}
      <Tabs
        accessibilityLabel="Reservas"
        items={[
          { key: "proximas", label: "Próximas", count: datos ? vigentes.length : undefined },
          { key: "canceladas", label: "Canceladas", count: datos ? canceladas.length : undefined },
        ]}
        value={pestana}
        onChange={(p) => {
          setAviso(null);
          setPestana(p);
        }}
      />
      <LineaDeAviso aviso={aviso} />
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudieron leer las reservas"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {datos && datos.areas.length === 0 ? <EmptyState icon="calendar-check" title="Este edificio no tiene áreas comunes registradas" /> : null}
      {datos && datos.areas.length > 0 && visibles.length === 0 ? (
        <EmptyState icon="calendar-check" title={pestana === "proximas" ? "No hay reservas próximas" : "No hay reservas canceladas"} />
      ) : null}
      {porDia(visibles).map((g) => (
        <Dia key={g.fecha} titulo={textoDelDia(g.fecha, hoy)}>
          {g.reservas.map((r, i) => (
            <FilaDeReserva key={r.id} reserva={r} area={nombreDelArea(r.areaId)} conArea={!area} primera={i === 0} onAccion={(a) => actuar(r, a)} />
          ))}
        </Dia>
      ))}
      {reservando && datos ? (
        <NuevaReserva
          reservas={reservas}
          edificioId={edificioId}
          areas={datos.areas}
          tomadas={datos.reservas}
          areaInicial={area}
          hoy={hoy}
          onCerrar={() => setReservando(false)}
          onHecho={(r) => {
            setReservando(false);
            setPestana("proximas");
            setAviso({ tono: "ok", texto: `Reserva registrada como pendiente: ${nombreDelArea(r.areaId)}, ${textoDeDia(r.fecha)}, unidad ${r.unidadNumero}.` });
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function Dia({ titulo, children }: { titulo: string; children: ReactNode }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.dia}>
      <Text style={textStyle(t, "label", t.color.text.secondary)} accessibilityRole="header">
        {titulo}
      </Text>
      <Card padding="md" style={s.tarjetaDia}>
        {children}
      </Card>
    </View>
  );
}

function FilaDeReserva({
  reserva: r,
  area,
  conArea,
  primera,
  onAccion,
}: {
  reserva: Reserva;
  area: string;
  conArea: boolean;
  primera: boolean;
  onAccion: (a: AccionDeReserva) => Promise<void>;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [enCurso, setEnCurso] = useState(false);
  const acciones = accionesDeLaReserva(r.estado);
  const nombre = `${area}, unidad ${r.unidadNumero}`;

  async function confirmar() {
    setEnCurso(true);
    await onAccion("confirmar");
    setEnCurso(false);
  }

  return (
    <View style={[s.fila, primera && s.primera]}>
      <View style={s.turno}>
        <Text style={[textStyle(t, "body"), s.fuerte]}>{TEXTO_DEL_TURNO[r.turno]}</Text>
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{HORARIO_DEL_TURNO[r.turno]}</Text>
      </View>
      <View style={s.queQuien}>
        {conArea ? <Text style={textStyle(t, "body")}>{area}</Text> : null}
        <View style={s.unidadEstado}>
          <Text style={textStyle(t, conArea ? "bodySmall" : "body", conArea ? t.color.text.secondary : undefined)}>{`Unidad ${r.unidadNumero}`}</Text>
          <Badge tone={ESTADO[r.estado].tono} label={ESTADO[r.estado].texto} />
        </View>
      </View>
      {acciones.length > 0 ? (
        <View style={s.acciones}>
          {acciones.includes("confirmar") ? (
            <Button size="sm" variant="secondary" label="Confirmar" accessibilityLabel={`Confirmar ${nombre}`} loading={enCurso} onPress={confirmar} />
          ) : null}
          <ConfirmButton
            size="sm"
            variant="ghost"
            label="Cancelar"
            question="¿Cancelar esta reserva?"
            confirmLabel="Sí, cancelar"
            cancelLabel="No"
            accessibilityLabel={`Cancelar ${nombre}`}
            disabled={enCurso}
            onConfirm={() => onAccion("cancelar")}
          />
        </View>
      ) : null}
    </View>
  );
}

function NuevaReserva({
  reservas,
  edificioId,
  areas,
  tomadas,
  areaInicial,
  hoy,
  onCerrar,
  onHecho,
}: {
  reservas: ReservasPuerto;
  edificioId: string;
  areas: AreaComun[];
  tomadas: Reserva[];
  areaInicial: string | undefined;
  hoy: string;
  onCerrar: () => void;
  onHecho: (r: Reserva) => void;
}) {
  const [datos, setDatos] = useState<DatosDeReserva>({ areaId: areaInicial, unidadId: undefined, fecha: undefined, turno: undefined });
  const [errores, setErrores] = useState<ErroresDeReserva>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const leer = useCallback(() => reservas.unidades(edificioId), [reservas, edificioId]);
  const { carga } = useCarga<UnidadParaReservar[]>(leer);
  const unidades = carga.estado === "listo" ? carga.valor : [];
  const ocupados = datos.areaId && datos.fecha ? turnosOcupados(tomadas, datos.areaId, datos.fecha) : new Set<string>();
  const elegida = areas.find((a) => a.id === datos.areaId);

  function cambiar<K extends keyof DatosDeReserva>(campo: K, valor: DatosDeReserva[K]) {
    const nuevos = { ...datos, [campo]: valor };
    // Si el turno elegido quedó ocupado al cambiar de área o de día, se suelta.
    if (campo !== "turno" && nuevos.turno && nuevos.areaId && nuevos.fecha && turnosOcupados(tomadas, nuevos.areaId, nuevos.fecha).has(nuevos.turno)) {
      nuevos.turno = undefined;
    }
    setDatos(nuevos);
    // La deuda se avisa apenas se elige la unidad, sin esperar a enviar.
    setErrores((e) => ({ ...e, [campo]: campo === "unidadId" ? avisoDeLaUnidad(valor as string, unidades) : undefined }));
  }

  async function reservar() {
    if (enviando) return;
    const e = validarReserva(datos, { hoy, reservas: tomadas, unidades });
    setErrores(e);
    if (Object.keys(e).length > 0 || !datos.areaId || !datos.unidadId || !datos.fecha || !datos.turno) return;
    setEnviando(true);
    const r = await reservas.reservar({ edificioId, areaId: datos.areaId, unidadId: datos.unidadId, fecha: datos.fecha, turno: datos.turno });
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Nueva reserva"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Reservar" onPress={reservar} loading={enviando} testID="reservas-guardar" />
        </>
      }
    >
      <CampoDeOpciones
        label="Área"
        required
        options={areas.map((a) => ({ id: a.id, label: a.nombre }))}
        value={datos.areaId}
        onChange={(v) => cambiar("areaId", v)}
        error={errores.areaId}
        helper={elegida ? `Aforo: ${elegida.aforo} personas` : undefined}
      />
      <Select
        label="Unidad"
        placeholder="Elige la unidad"
        accessibilityLabel="Unidad que reserva"
        options={unidades.map((u) => ({ id: u.id, label: `Unidad ${u.numero}`, detail: u.alDia ? undefined : "Con deuda vencida" }))}
        value={datos.unidadId}
        onChange={(id) => cambiar("unidadId", id)}
        error={errores.unidadId}
      />
      <CampoDia valor={datos.fecha} hoy={hoy} error={errores.fecha} onChange={(f) => cambiar("fecha", f)} />
      <CampoDeOpciones
        label="Turno"
        required
        options={TURNOS.map((t) => ({
          id: t,
          label: ocupados.has(t) ? `${TEXTO_DEL_TURNO[t]} · ocupado` : `${TEXTO_DEL_TURNO[t]} · ${HORARIO_DEL_TURNO[t]}`,
          disabled: ocupados.has(t),
        }))}
        value={datos.turno}
        onChange={(v) => cambiar("turno", v)}
        error={errores.turno}
      />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

/** Los días que se pueden reservar: de hoy a dos semanas (supuesto, en el dominio). */
function CampoDia({ valor, hoy, error, onChange }: { valor: string | undefined; hoy: string; error?: string; onChange: (f: string | undefined) => void }) {
  const dias = diasReservables(hoy);
  return (
    <CampoDeOpciones
      label="Día"
      required
      options={dias.map((f, i) => ({ id: f, label: i === 0 ? `Hoy ${textoDeDia(f).split(" ")[1]}` : textoDeDia(f).split(" ").slice(0, 2).join(" ") }))}
      value={valor}
      onChange={onChange}
      error={error}
      helper={valor ? textoDeDia(valor) : undefined}
    />
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    dia: { gap: t.space.xs },
    tarjetaDia: { paddingVertical: t.space.xs },
    fila: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: t.space.md,
      rowGap: t.space.xs,
      paddingVertical: t.space.sm,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    primera: { borderTopWidth: 0 },
    turno: { width: 96 },
    queQuien: { flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: t.space.xxs },
    unidadEstado: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    fuerte: { fontWeight: "600" },
    acciones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm, marginLeft: "auto" },
  });
