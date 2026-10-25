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
 *
 * Una unidad ya registrada se abre como ficha (PB-19): el título dice el
 * número y, si la ruta enchufa la cuenta (`Cuenta`), su estado en palabras;
 * la pestaña Resumen junta datos, saldo y personas, y las demás pestañas las
 * pone la cuenta. Solo aparecen las pestañas que tienen contenido. Editar los
 * datos es otra ruta (`…/editar`).
 */
import { router } from "expo-router";
import { useCallback, useRef, useState, type ComponentType, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextInput } from "react-native";

import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorSummary,
  FormFooter,
  Icon,
  PageHeader,
  SectionTitle,
  TableRow,
  Tabs,
  TdView,
  TextField,
  DataTable,
  textStyle,
  useStyles,
  useTheme,
  type StatusTone,
  type Tema,
} from "@/ui";

import { guardarUnidad } from "../application/save-unit";
import type { PuertosDelPadron } from "../application/ports";
import { leerParticipacion, participacionConEsta, textoDePorcentaje } from "../domain/ownership-share";
import type { Persona } from "../domain/person";
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
} from "../domain/unit";
import { nombreDeLaRelacion, type Vinculo } from "../domain/link";
import { Aviso, FlechaDeFila, Volver } from "@/shared/ui/pieces";
import { irALasUnidades } from "./units-screen";
import { useCarga } from "@/shared/ui/use-load";

/** Lo que otros módulos (cobranza, pagos) ponen en la ficha. El padrón no sabe de recibos ni de pagos. */
export interface CuentaDeLaUnidad {
  estado?: { texto: string; tono: StatusTone };
  /** La acción primaria de la ficha, junto a "Editar unidad" (por ejemplo, "Registrar pago"). */
  accion?: ReactNode;
  /** Va en la pestaña Resumen, entre los datos y las personas. */
  resumen?: ReactNode;
  pestanas: { key: string; label: string; contenido: ReactNode }[];
}

export type PropsDeCuenta = { orgId: string; unidadId: string; children: (cuenta: CuentaDeLaUnidad) => ReactNode };

interface Props {
  padron: PuertosDelPadron;
  edificioId: string;
  /** Sin `unidadId`, el alta; con él, esa unidad. */
  unidadId?: string;
  /** Con `unidadId`: su ficha, o el formulario para editarla. */
  modo?: "ficha" | "editar";
  /** Lo que la ruta enchufa de la cobranza. */
  Cuenta?: ComponentType<PropsDeCuenta>;
}

export function PantallaUnidad({ padron, edificioId, unidadId, modo, Cuenta }: Props) {
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
          modo={modo}
          Cuenta={Cuenta}
        />
      )}
    </ConOrganizacion>
  );
}

function Contenido({ orgId, editable, padron, edificioId, unidadId, modo = "ficha", Cuenta }: Props & { orgId: string; editable: boolean }) {
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
        icon="refresh-cw"
        title="No se pudo leer la unidad"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (!carga.valor.edificio || (unidadId && !unidad)) {
    problema = <EmptyState icon="door" title="Esta unidad no está en el edificio" />;
  } else if (!editable && !unidadId) {
    problema = (
      <EmptyState icon="lock" title="Tu rol no permite registrar unidades" description="Pídeselo a un administrador de tu empresa." />
    );
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

  if (unidad && (modo === "ficha" || !editable)) {
    const ficha = (cuenta: CuentaDeLaUnidad) => (
      <FichaConPestanas
        unidad={unidad}
        edificioId={edificioId}
        editable={editable}
        cuenta={cuenta}
        volver={volver}
        personas={<Personas edificioId={edificioId} unidad={unidad} vinculos={vinculos} personas={personas} editable={editable} />}
      />
    );
    return (
      <ScrollView contentContainerStyle={[s.pantalla, s.pantallaFicha]}>
        {Cuenta ? (
          <Cuenta orgId={orgId} unidadId={unidad.id}>
            {ficha}
          </Cuenta>
        ) : (
          ficha({ pestanas: [] })
        )}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <PageHeader
          title={unidad ? `Editar unidad ${unidad.numero}` : "Registrar unidad"}
          back={unidad ? { label: `Unidad ${unidad.numero}`, onPress: () => irALaFicha(edificioId, unidad.id) } : { label: "Unidades", onPress: volver }}
        />
        <Formulario padron={padron} orgId={orgId} edificioId={edificioId} unidad={unidad} unidades={unidades} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Desde este ancho de ventana, la ficha va en dos columnas. */
const ANCHO_DOS_COLUMNAS = 1100;

const irALaFicha = (edificioId: string, unidadId: string) =>
  router.navigate({ pathname: "/buildings/[id]/units/[unitId]", params: { id: edificioId, unitId: unidadId } });

function FichaConPestanas({
  unidad,
  edificioId,
  editable,
  cuenta,
  personas,
  volver,
}: {
  unidad: Unidad;
  edificioId: string;
  editable: boolean;
  cuenta: CuentaDeLaUnidad;
  personas: ReactNode;
  volver: () => void;
}) {
  const s = useStyles(makeStyles);
  // En una ventana ancha la ficha va en dos columnas: los datos y la cuenta a un lado, las personas al otro.
  const anchoDeColumnas = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  const [pestana, setPestana] = useState("resumen");
  const pestanas = [{ key: "resumen", label: "Resumen" }, ...cuenta.pestanas.map(({ key, label }) => ({ key, label }))];
  const actual = cuenta.pestanas.find((p) => p.key === pestana);
  return (
    <>
      <PageHeader
        title={`Unidad ${unidad.numero}`}
        back={{ label: "Unidades", onPress: volver }}
        status={cuenta.estado ? <Badge tone={cuenta.estado.tono} label={cuenta.estado.texto} /> : null}
        actions={
          <>
            {editable ? (
              <Button
                variant="secondary"
                icon="pencil"
                label="Editar unidad"
                onPress={() =>
                  router.push({ pathname: "/buildings/[id]/units/[unitId]/edit", params: { id: edificioId, unitId: unidad.id } })
                }
              />
            ) : null}
            {cuenta.accion}
          </>
        }
      />
      {pestanas.length > 1 ? <Tabs accessibilityLabel="Secciones de la ficha" items={pestanas} value={pestana} onChange={setPestana} /> : null}
      {actual ? (
        actual.contenido
      ) : (
        <View style={anchoDeColumnas ? s.columnas : s.apilado}>
          <View style={anchoDeColumnas ? s.columnaAncha : s.apilado}>
            {cuenta.resumen}
            <Ficha unidad={unidad} />
          </View>
          <View style={anchoDeColumnas ? s.columnaAncha : s.apilado}>{personas}</View>
        </View>
      )}
    </>
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
      if (unidad) irALaFicha(edificioId, unidad.id);
      // Recién registrada, se queda en ella para agregarle personas.
      else router.replace({ pathname: "/buildings/[id]/units/[unitId]", params: { id: edificioId, unitId: r.unidad.id } });
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

/** Los datos de la unidad en una fila de tres: el rótulo arriba y el valor abajo, que es lo que se lee. */
function Ficha({ unidad }: { unidad: Unidad }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const datos: { etiqueta: string; valor: string; falta?: boolean }[] = [
    { etiqueta: "Tipo", valor: unidad.tipo ?? "—" },
    { etiqueta: "Área", valor: textoDeArea(unidad.areaM2) },
    {
      etiqueta: "Participación",
      valor: unidad.participacion === null ? "! Sin participación" : textoDePorcentaje(unidad.participacion),
      falta: unidad.participacion === null,
    },
  ];
  return (
    <Card style={s.bloque} padding="lg">
      <SectionTitle>Datos de la unidad</SectionTitle>
      <View style={s.datos}>
        {datos.map((d) => (
          <View key={d.etiqueta} style={s.dato} accessible accessibilityLabel={`${d.etiqueta}: ${d.valor}`}>
            <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{d.etiqueta}</Text>
            <Text style={textStyle(t, "subtitle", d.falta ? t.color.warning.fg : t.color.text.primary)}>{d.valor}</Text>
          </View>
        ))}
      </View>
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
  const params = { id: edificioId, unitId: unidad.id };
  const agregar = () => router.push({ pathname: "/buildings/[id]/units/[unitId]/people/new", params });

  return (
    <Card style={s.bloque} padding="lg">
      <View style={s.cabecera}>
        <SectionTitle>Personas</SectionTitle>
        {editable ? (
          <Button variant="secondary" size="sm" icon="plus" label="Agregar persona" onPress={agregar} testID="unidad-agregar-persona" />
        ) : null}
      </View>
      {vinculos.length === 0 ? (
        <View style={s.sinPersonas}>
          <Icon name="users" color={t.color.text.tertiary} />
          <Text style={textStyle(t, "body", t.color.text.secondary)}>Todavía no hay personas en esta unidad.</Text>
        </View>
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
                            pathname: "/buildings/[id]/units/[unitId]/people/[linkId]",
                            params: { ...params, linkId: v.id },
                          })
                      : undefined
                  }
                  accessibilityLabel={`${editable ? "Editar a " : ""}${quien}, ${nombreDeLaRelacion(v.relacion)}${v.responsablePago ? ", responsable de pago" : ""}`}
                >
                  <Avatar name={quien} size="sm" accessibilityLabel="" />
                  <TdView flex={1} style={s.persona}>
                    <Text style={[textStyle(t, "body"), s.fuerte]}>{quien}</Text>
                    <View style={s.insignias}>
                      <Badge label={nombreDeLaRelacion(v.relacion)} />
                      {v.responsablePago ? <Badge tone="info" label="✓ Responsable de pago" /> : null}
                    </View>
                  </TdView>
                  {editable ? <FlechaDeFila /> : null}
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
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
    pantallaFicha: { maxWidth: 1200 },
    bloque: { width: "100%", gap: t.space.md },
    columnas: { flexDirection: "row", alignItems: "flex-start", gap: t.space.lg },
    columnaAncha: { flex: 1, minWidth: 0, gap: t.space.lg },
    apilado: { gap: t.space.lg },
    sinPersonas: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
    fuerte: { fontWeight: "600" },
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    celda: { flexGrow: 1, flexBasis: 200 },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.md },
    titulo: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    acciones: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: t.space.sm },
    persona: { gap: t.space.xs },
    insignias: { flexDirection: "row", flexWrap: "wrap", gap: t.space.xs },
    datos: { flexDirection: "row", flexWrap: "wrap", gap: t.space.lg },
    dato: { flexGrow: 1, flexBasis: 90, gap: t.space.xxs },

  });
