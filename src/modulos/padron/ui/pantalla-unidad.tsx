/**
 * Una unidad: su alta, su edición y las personas que están en ella (PB-08).
 *
 * - El formulario sigue al de edificios (H9): asterisco en lo obligatorio,
 *   ejemplo del formato en cada campo, error junto al campo y resumen arriba
 *   que lleva al campo; desde el primer intento, cada cambio se vuelve a
 *   comprobar.
 * - Junto a la participación se dice cómo queda el edificio con ese valor,
 *   mientras se escribe, para corregir antes de guardar.
 * - Registrada la unidad, se queda en ella para agregarle personas.
 * - Debajo, las personas de la unidad con su vínculo y quién es responsable
 *   de pago. El personal ve lo mismo, sin formularios.
 */
import { router } from "expo-router";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";

import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorSummary,
  FormFooter,
  KeyValueRow,
  ScreenTitle,
  SectionTitle,
  TableRow,
  TdView,
  TextField,
  DataTable,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { guardarUnidad } from "../aplicacion/guardar-unidad";
import type { PuertosDelPadron } from "../aplicacion/puertos";
import { leerParticipacion, participacionConEsta, textoDePorcentaje } from "../dominio/participacion";
import type { Persona } from "../dominio/persona";
import {
  datosDeUnidad,
  listaDeErroresUnidad,
  puedeEditarPadron,
  textoDeArea,
  validarUnidad,
  type CampoUnidad,
  type DatosUnidad,
  type ErroresUnidad,
  type Unidad,
} from "../dominio/unidad";
import { nombreDeLaRelacion, type Vinculo } from "../dominio/vinculo";
import { Aviso, Volver } from "./piezas";
import { irALasUnidades } from "./pantalla-unidades";
import { useCarga } from "./usar-carga";

interface Props {
  padron: PuertosDelPadron;
  edificioId: string;
  /** Sin `unidadId`, el alta; con él, esa unidad. */
  unidadId?: string;
}

export function PantallaUnidad({ padron, edificioId, unidadId }: Props) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        <Contenido
          key={`${enCurso.orgId}-${edificioId}-${unidadId ?? "nueva"}`}
          orgId={enCurso.orgId}
          editable={puedeEditarPadron(enCurso.rol)}
          padron={padron}
          edificioId={edificioId}
          unidadId={unidadId}
        />
      )}
    </ConOrganizacion>
  );
}

function Contenido({ orgId, editable, padron, edificioId, unidadId }: Props & { orgId: string; editable: boolean }) {
  const s = useStyles(makeStyles);
  const leer = useCallback(async () => {
    const [edificios, unidades, vinculos, personas] = await Promise.all([
      padron.edificios.listar(orgId),
      padron.unidades.delEdificio(orgId, edificioId),
      unidadId ? padron.vinculos.deLaUnidad(orgId, unidadId) : Promise.resolve<Vinculo[]>([]),
      unidadId ? padron.personas.listar(orgId) : Promise.resolve<Persona[]>([]),
    ]);
    return { edificio: edificios.find((e) => e.id === edificioId), unidades, vinculos, personas };
  }, [padron, orgId, edificioId, unidadId]);
  const { carga, reintentar } = useCarga(leer);
  const volver = () => irALasUnidades(edificioId);

  if (carga.estado === "cargando") return <Cargando />;

  const unidad = carga.estado === "listo" && unidadId ? carga.valor.unidades.find((u) => u.id === unidadId) : undefined;
  let problema: ReactNode = null;
  if (carga.estado === "error") {
    problema = (
      <EmptyState
        title="No se pudo leer la unidad"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (!carga.valor.edificio || (unidadId && !unidad)) {
    problema = <EmptyState title="Esta unidad no está en el edificio" />;
  } else if (!editable && !unidadId) {
    problema = <EmptyState title="Tu rol no permite registrar unidades" description="Pídeselo a un administrador de tu empresa." />;
  }
  if (problema || carga.estado !== "listo") {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label="Unidades" onPress={volver} />
        {problema}
      </ScrollView>
    );
  }

  const { unidades, vinculos, personas } = carga.valor;
  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <Volver label="Unidades" onPress={volver} />
        {editable ? (
          <Formulario padron={padron} orgId={orgId} edificioId={edificioId} unidad={unidad} unidades={unidades} />
        ) : unidad ? (
          <Ficha unidad={unidad} />
        ) : null}
        {unidad ? (
          <Personas edificioId={edificioId} unidad={unidad} vinculos={vinculos} personas={personas} editable={editable} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Formulario({
  padron,
  orgId,
  edificioId,
  unidad,
  unidades,
}: {
  padron: PuertosDelPadron;
  orgId: string;
  edificioId: string;
  unidad?: Unidad;
  unidades: Unidad[];
}) {
  const s = useStyles(makeStyles);
  const [datos, setDatos] = useState<DatosUnidad>(() => datosDeUnidad(unidad));
  const [errores, setErrores] = useState<ErroresUnidad>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refNumero = useRef<TextInput>(null);
  const refTipo = useRef<TextInput>(null);
  const refArea = useRef<TextInput>(null);
  const refParticipacion = useRef<TextInput>(null);
  const refs: Record<CampoUnidad, typeof refNumero> = { numero: refNumero, tipo: refTipo, area: refArea, participacion: refParticipacion };

  function cambiar(campo: CampoUnidad, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    if (intentosFallidos > 0) {
      const v = validarUnidad(nuevos, unidades, unidad?.id);
      setErrores(v.ok ? {} : v.errores);
    }
  }

  async function guardar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await guardarUnidad(padron.unidades, { orgId, edificioId, datos, otras: unidades, id: unidad?.id });
    setEnviando(false);
    if (r.ok) {
      if (unidad) irALasUnidades(edificioId);
      // Recién registrada, se queda en ella para agregarle personas.
      else router.replace({ pathname: "/edificios/[id]/unidades/[unidadId]", params: { id: edificioId, unidadId: r.unidad.id } });
      return;
    }
    setErrores(r.errores);
    setGeneral(r.general ?? null);
    if (listaDeErroresUnidad(r.errores).length > 0) setIntentosFallidos((n) => n + 1);
  }

  const lista = listaDeErroresUnidad(errores);
  const lectura = leerParticipacion(datos.participacion);
  let ayudaParticipacion = "Opcional. Hasta cuatro decimales.";
  if (lectura.ok && lectura.valor !== null) {
    const r = participacionConEsta(unidades, lectura.valor, unidad?.id);
    ayudaParticipacion = `Con esta unidad, el edificio suma ${textoDePorcentaje(r.total)}`;
    if (r.diferencia > 0) ayudaParticipacion += `: faltan ${textoDePorcentaje(r.diferencia)}.`;
    else if (r.diferencia < 0) ayudaParticipacion += `: se pasa por ${textoDePorcentaje(-r.diferencia)}.`;
    else ayudaParticipacion += ".";
  }

  return (
    <Card style={s.tarjeta} padding="xl">
      <ScreenTitle>{unidad ? `Unidad ${unidad.numero}` : "Registrar unidad"}</ScreenTitle>
      <ErrorSummary
        title={lista.length === 1 ? "Corrige 1 campo para guardar" : `Corrige ${lista.length} campos para guardar`}
        focusKey={intentosFallidos}
        items={lista.map((e) => ({ key: e.campo, label: e.etiqueta, message: e.mensaje, onPress: () => refs[e.campo].current?.focus() }))}
      />
      <View style={s.fila}>
        <View style={s.celda}>
          <TextField
            inputRef={refNumero}
            label="Número"
            required
            value={datos.numero}
            onChangeText={(v) => cambiar("numero", v)}
            placeholder="Ej.: 101 o L-2"
            autoCapitalize="characters"
            autoFocus={!unidad}
            error={errores.numero}
            testID="unidad-numero"
          />
        </View>
        <View style={s.celda}>
          <TextField
            inputRef={refTipo}
            label="Tipo"
            value={datos.tipo}
            onChangeText={(v) => cambiar("tipo", v)}
            placeholder="Ej.: Departamento"
            autoCapitalize="sentences"
            helper="Opcional."
            error={errores.tipo}
            testID="unidad-tipo"
          />
        </View>
      </View>
      <View style={s.fila}>
        <View style={s.celda}>
          <TextField
            inputRef={refArea}
            label="Área (m²)"
            value={datos.area}
            onChangeText={(v) => cambiar("area", v)}
            placeholder="Ej.: 85,5"
            keyboardType="decimal-pad"
            helper="Opcional."
            error={errores.area}
            testID="unidad-area"
          />
        </View>
        <View style={s.celda}>
          <TextField
            inputRef={refParticipacion}
            label="Participación (%)"
            value={datos.participacion}
            onChangeText={(v) => cambiar("participacion", v)}
            placeholder="Ej.: 2,5"
            keyboardType="decimal-pad"
            helper={ayudaParticipacion}
            error={errores.participacion}
            onSubmitEditing={guardar}
            testID="unidad-participacion"
          />
        </View>
      </View>
      <FormFooter error={general}>
        <Button variant="secondary" label="Cancelar" onPress={() => irALasUnidades(edificioId)} disabled={enviando} />
        <Button label={unidad ? "Guardar cambios" : "Registrar unidad"} onPress={guardar} loading={enviando} testID="unidad-guardar" />
      </FormFooter>
    </Card>
  );
}

function Ficha({ unidad }: { unidad: Unidad }) {
  const s = useStyles(makeStyles);
  return (
    <Card style={s.tarjeta} padding="xl">
      <ScreenTitle>{`Unidad ${unidad.numero}`}</ScreenTitle>
      <KeyValueRow label="Tipo" value={unidad.tipo ?? "—"} />
      <KeyValueRow label="Área" value={textoDeArea(unidad.areaM2)} />
      <KeyValueRow
        label="Participación"
        value={unidad.participacion === null ? "Sin participación" : textoDePorcentaje(unidad.participacion)}
      />
    </Card>
  );
}

function Personas({
  edificioId,
  unidad,
  vinculos,
  personas,
  editable,
}: {
  edificioId: string;
  unidad: Unidad;
  vinculos: Vinculo[];
  personas: Persona[];
  editable: boolean;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const nombre = new Map(personas.map((p) => [p.id, p.nombre]));
  const hayResponsable = vinculos.some((v) => v.responsablePago);
  const params = { id: edificioId, unidadId: unidad.id };
  const agregar = () => router.push({ pathname: "/edificios/[id]/unidades/[unidadId]/personas/nueva", params });

  return (
    <Card style={s.tarjeta} padding="xl">
      <View style={s.cabecera}>
        <SectionTitle>Personas</SectionTitle>
        {editable ? <Button variant="secondary" label="Agregar persona" onPress={agregar} testID="unidad-agregar-persona" /> : null}
      </View>
      {vinculos.length === 0 ? (
        <Text style={textStyle(t, "body", t.color.text.secondary)}>Todavía no hay personas en esta unidad.</Text>
      ) : (
        <>
          {hayResponsable ? null : <Aviso>Nadie está marcado como responsable de pago.</Aviso>}
          <DataTable minWidth={0}>
            {vinculos.map((v) => {
              const quien = nombre.get(v.personaId) ?? "—";
              return (
                <TableRow
                  key={v.id}
                  onPress={
                    editable
                      ? () =>
                          router.push({
                            pathname: "/edificios/[id]/unidades/[unidadId]/personas/[vinculoId]",
                            params: { ...params, vinculoId: v.id },
                          })
                      : undefined
                  }
                  accessibilityLabel={`${editable ? "Editar a " : ""}${quien}, ${nombreDeLaRelacion(v.relacion)}${v.responsablePago ? ", responsable de pago" : ""}`}
                >
                  <TdView flex={1} style={s.persona}>
                    <Text style={textStyle(t, "body")}>{quien}</Text>
                    <View style={s.insignias}>
                      <Badge label={nombreDeLaRelacion(v.relacion)} />
                      {v.responsablePago ? <Badge tone="info" label="✓ Responsable de pago" /> : null}
                    </View>
                  </TdView>
                  {editable ? (
                    <Text aria-hidden style={[textStyle(t, "label", t.color.accent.text), s.flecha]}>
                      Editar ›
                    </Text>
                  ) : null}
                </TableRow>
              );
            })}
          </DataTable>
        </>
      )}
    </Card>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    celda: { flexGrow: 1, flexBasis: 200 },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    persona: { gap: t.space.xs },
    insignias: { flexDirection: "row", flexWrap: "wrap", gap: t.space.xs },
    flecha: { width: 64, textAlign: "right" },
  });
