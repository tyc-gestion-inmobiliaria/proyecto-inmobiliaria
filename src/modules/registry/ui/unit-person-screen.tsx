/**
 * Una persona en una unidad: agregarla (nueva o ya registrada en otra
 * unidad), editar sus datos, su vínculo y si es la responsable de pago, o
 * quitarla de la unidad (PB-08).
 *
 * - El vínculo es obligatorio: propietario, inquilino o residente. Ser
 *   responsable de pago es una casilla aparte, porque un propietario o un
 *   inquilino pueden serlo.
 * - Hay un solo responsable de pago por unidad: marcar a otra persona le
 *   pasa la marca (la base lo hace en un solo paso). Por eso la casilla de
 *   quien ya lo es no se desmarca acá.
 * - Si un guardado queda a medias (la persona se registró pero el vínculo
 *   no), el formulario sigue desde lo que quedó y no la registra dos veces.
 */
import { router } from "expo-router";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";

import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import {
  Button,
  Card,
  Checkbox,
  ConfirmButton,
  EmptyState,
  ErrorSummary,
  FormFooter,
  PageHeader,
  Select,
  TextField,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { mensajeDelFallo } from "../application/messages";
import {
  agregarPersonaALaUnidad,
  editarPersonaDeLaUnidad,
  type ErroresPersonaEnUnidad,
  type ResultadoPersonaEnUnidad,
} from "../application/unit-people";
import type { PuertosDelPadron } from "../application/ports";
import {
  CAMPOS_PERSONA,
  datosDePersona,
  ETIQUETA_CAMPO_PERSONA,
  nombreDelDocumento,
  TIPOS_DOCUMENTO,
  type DatosPersona,
  type Persona,
} from "../domain/person";
import { puedeEditarPadron, type Unidad } from "../domain/unit";
import { nombreDeLaRelacion, RELACIONES, type Relacion, type Vinculo } from "../domain/link";
import { CampoDeOpciones, Volver } from "@/shared/ui/pieces";
import { useNombreDelEdificio } from "@/shared/context/context-provider";
import { irALasUnidades } from "./units-screen";
import { useCarga } from "@/shared/ui/use-load";

interface Props {
  padron: PuertosDelPadron;
  edificioId: string;
  unidadId: string;
  /** Sin `vinculoId`, se agrega a alguien; con él, se edita a esa persona en la unidad. */
  vinculoId?: string;
}

export function PantallaPersonaDeUnidad(props: Props) {
  return (
    <ConOrganizacion>
      {(enCurso) => (
        <Contenido
          key={`${enCurso.orgId}-${props.unidadId}-${props.vinculoId ?? "nueva"}`}
          {...props}
          orgId={enCurso.orgId}
          editable={puedeEditarPadron(enCurso.rol)}
        />
      )}
    </ConOrganizacion>
  );
}

function Contenido({ padron, edificioId, unidadId, vinculoId, orgId, editable }: Props & { orgId: string; editable: boolean }) {
  const s = useStyles(makeStyles);
  const leer = useCallback(async () => {
    const [unidades, personas, vinculos] = await Promise.all([
      padron.unidades.delEdificio(orgId, edificioId),
      padron.personas.listar(orgId),
      padron.vinculos.deLaUnidad(orgId, unidadId),
    ]);
    return { unidad: unidades.find((u) => u.id === unidadId), personas, vinculos };
  }, [padron, orgId, edificioId, unidadId]);
  const { carga, reintentar } = useCarga(leer);
  const volver = () => router.navigate({ pathname: "/buildings/[id]/units/[unitId]", params: { id: edificioId, unitId: unidadId } });

  if (carga.estado === "cargando") return <Cargando />;

  const vinculo = carga.estado === "listo" && vinculoId ? carga.valor.vinculos.find((v) => v.id === vinculoId) : undefined;
  let problema: ReactNode = null;
  if (!editable) {
    problema = <EmptyState icon="lock" title="Tu rol no permite cambiar las personas de una unidad" description="Pídeselo a un administrador de tu empresa." />;
  } else if (carga.estado === "error") {
    problema = (
      <EmptyState
        icon="refresh-cw"
        title="No se pudo leer la unidad"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (!carga.valor.unidad) {
    problema = <EmptyState icon="door" title="Esta unidad no está en el edificio" />;
  } else if (vinculoId && !vinculo) {
    problema = <EmptyState icon="user" title="Esta persona ya no está en la unidad" />;
  }
  if (problema || carga.estado !== "listo" || !carga.valor.unidad) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <Volver label="Unidad" onPress={volver} />
        {problema}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <Formulario
          padron={padron}
          orgId={orgId}
          unidad={carga.valor.unidad}
          personasIniciales={carga.valor.personas}
          vinculos={carga.valor.vinculos}
          vinculoInicial={vinculo}
          volver={volver}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const OPCIONES_RELACION = RELACIONES.map((r) => ({ id: r, label: nombreDeLaRelacion(r) }));
const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO.map((d) => ({ id: d, label: nombreDelDocumento(d) }));

type Modo = "nueva" | "existente";

function detalleDePersona(p: Persona): string | undefined {
  if (p.documentoTipo && p.documentoNumero) return `${nombreDelDocumento(p.documentoTipo)} ${p.documentoNumero}`;
  return p.correo ?? p.telefono ?? undefined;
}

function Formulario({
  padron,
  orgId,
  unidad,
  personasIniciales,
  vinculos,
  vinculoInicial,
  volver,
}: {
  padron: PuertosDelPadron;
  orgId: string;
  unidad: Unidad;
  personasIniciales: Persona[];
  vinculos: Vinculo[];
  vinculoInicial?: Vinculo;
  volver: () => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const nombreDelEdificio = useNombreDelEdificio(unidad.edificioId);
  const [personas, setPersonas] = useState(personasIniciales);
  const [vinculo, setVinculo] = useState(vinculoInicial);
  const persona = vinculo ? personas.find((p) => p.id === vinculo.personaId) : undefined;
  const [modo, setModo] = useState<Modo>("nueva");
  const [personaId, setPersonaId] = useState("");
  const [datos, setDatos] = useState<DatosPersona>(() => datosDePersona(persona));
  const [relacion, setRelacion] = useState<Relacion | undefined>(vinculoInicial?.relacion);
  // Sin responsable todavía, quien se agrega lo es salvo que se desmarque.
  const [responsable, setResponsable] = useState(vinculoInicial ? vinculoInicial.responsablePago : !vinculos.some((v) => v.responsablePago));
  const [errores, setErrores] = useState<ErroresPersonaEnUnidad>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refNombre = useRef<TextInput>(null);
  const refDocumento = useRef<TextInput>(null);
  const refCorreo = useRef<TextInput>(null);
  const refTelefono = useRef<TextInput>(null);
  const refs: Partial<Record<keyof ErroresPersonaEnUnidad, typeof refNombre>> = {
    nombre: refNombre,
    documentoNumero: refDocumento,
    correo: refCorreo,
    telefono: refTelefono,
  };

  const yaEnLaUnidad = new Set(vinculos.map((v) => v.personaId));
  const elegibles = personas.filter((p) => !yaEnLaUnidad.has(p.id));
  const editando = Boolean(vinculo);
  const conDatos = editando || modo === "nueva";

  function cambiar(campo: keyof DatosPersona, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  /** Lo que quedó guardado aunque el resto fallara: el siguiente intento sigue desde ahí. */
  function tomarLoGuardado(r: Extract<ResultadoPersonaEnUnidad, { ok: false }>) {
    if (r.persona) {
      const nueva = r.persona;
      setPersonas((ps) => (ps.some((p) => p.id === nueva.id) ? ps : [...ps, nueva]));
      setModo("existente");
      setPersonaId(nueva.id);
    }
    if (r.vinculo) {
      const conPersona = r.persona ?? personas.find((p) => p.id === r.vinculo?.personaId);
      setVinculo(r.vinculo);
      setDatos(datosDePersona(conPersona));
    }
  }

  async function guardar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const puertos = { personas: padron.personas, vinculos: padron.vinculos };
    const r = vinculo
      ? await editarPersonaDeLaUnidad(puertos, { orgId, vinculo, datos, relacion, responsable })
      : await agregarPersonaALaUnidad(puertos, {
          orgId,
          unidadId: unidad.id,
          quien: modo === "nueva" ? { modo, datos } : { modo, personaId },
          relacion,
          responsable,
          vinculosDeLaUnidad: vinculos,
        });
    setEnviando(false);
    if (r.ok) {
      volver();
      return;
    }
    tomarLoGuardado(r);
    setErrores(r.errores);
    setGeneral(r.general ?? null);
    if (Object.values(r.errores).some(Boolean)) setIntentosFallidos((n) => n + 1);
  }

  async function quitar() {
    if (!vinculo) return;
    const r = await padron.vinculos.desvincular(orgId, vinculo.id);
    if (r.ok) volver();
    else setGeneral(mensajeDelFallo(r.fallo));
  }

  const lista = [
    ...(errores.personaId ? [{ key: "personaId", label: "Persona", message: errores.personaId }] : []),
    ...CAMPOS_PERSONA.flatMap((c) => {
      const message = errores[c];
      const ref = refs[c];
      return message ? [{ key: c, label: ETIQUETA_CAMPO_PERSONA[c], message, onPress: ref ? () => ref.current?.focus() : undefined }] : [];
    }),
    ...(errores.relacion ? [{ key: "relacion", label: "Vínculo", message: errores.relacion }] : []),
  ];

  return (
    <>
      <PageHeader
        title={persona ? persona.nombre : `Agregar persona a la unidad ${unidad.numero}`}
        back={{
          label: `Unidad ${unidad.numero}`,
          onPress: volver,
          trail: [
            { label: "Edificios", onPress: () => router.navigate("/buildings") },
            { label: nombreDelEdificio ?? "Unidades", onPress: () => irALasUnidades(unidad.edificioId) },
          ],
        }}
      />
      <Card style={s.tarjeta} padding="xl">
        <ErrorSummary
          title={lista.length === 1 ? "Corrige 1 campo para guardar" : `Corrige ${lista.length} campos para guardar`}
          focusKey={intentosFallidos}
          items={lista}
        />

        {!editando && elegibles.length > 0 ? (
          <CampoDeOpciones<Modo>
            label="Persona"
            options={[
              { id: "nueva", label: "Nueva" },
              { id: "existente", label: "Ya registrada" },
            ]}
            value={modo}
            onChange={(m) => {
              if (m) setModo(m);
            }}
          />
        ) : null}

        {conDatos ? (
          <>
            <TextField
              inputRef={refNombre}
              label="Nombre"
              required
              value={datos.nombre}
              onChangeText={(v) => cambiar("nombre", v)}
              placeholder="Ej.: María Quispe Rojas"
              autoCapitalize="words"
              autoFocus={!editando}
              error={errores.nombre}
              testID="persona-nombre"
            />
            <CampoDeOpciones
              label="Tipo de documento"
              options={OPCIONES_DOCUMENTO}
              value={datos.documentoTipo || undefined}
              onChange={(tipo) => cambiar("documentoTipo", tipo ?? "")}
              clearable
              error={errores.documentoTipo}
              helper="Opcional."
            />
            <TextField
              inputRef={refDocumento}
              label="Número de documento"
              value={datos.documentoNumero}
              onChangeText={(v) => cambiar("documentoNumero", v)}
              placeholder={datos.documentoTipo === "ruc" ? "Ej.: 20123456789" : "Ej.: 45678912"}
              autoCapitalize="characters"
              error={errores.documentoNumero}
              testID="persona-documento"
            />
            <View style={s.fila}>
              <View style={s.celda}>
                <TextField
                  inputRef={refCorreo}
                  label="Correo"
                  value={datos.correo}
                  onChangeText={(v) => cambiar("correo", v)}
                  placeholder="Ej.: nombre@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  helper="Opcional."
                  error={errores.correo}
                  testID="persona-correo"
                />
              </View>
              <View style={s.celda}>
                <TextField
                  inputRef={refTelefono}
                  label="Teléfono"
                  value={datos.telefono}
                  onChangeText={(v) => cambiar("telefono", v)}
                  placeholder="Ej.: +51 987 654 321"
                  keyboardType="phone-pad"
                  helper="Opcional."
                  error={errores.telefono}
                  testID="persona-telefono"
                />
              </View>
            </View>
          </>
        ) : (
          <Select
            label="Persona registrada"
            value={personaId || undefined}
            onChange={(id) => {
              setPersonaId(id);
              setErrores((e) => ({ ...e, personaId: undefined }));
            }}
            placeholder="Elige a la persona"
            accessibilityLabel="Persona registrada"
            options={elegibles.map((p) => ({ id: p.id, label: p.nombre, detail: detalleDePersona(p) }))}
            filterFrom={6}
            error={errores.personaId}
          />
        )}

        <CampoDeOpciones
          label="Vínculo con la unidad"
          required
          options={OPCIONES_RELACION}
          value={relacion}
          onChange={(r) => {
            setRelacion(r);
            if (r) setErrores((e) => ({ ...e, relacion: undefined }));
          }}
          error={errores.relacion}
        />
        <View style={s.casilla}>
          <Checkbox
            label="Responsable de pago"
            checked={responsable}
            onChange={setResponsable}
            disabled={Boolean(vinculo?.responsablePago)}
          />
          {vinculo?.responsablePago ? (
            <Text style={textStyle(t, "caption", t.color.text.secondary)}>Para cambiarlo, márcalo en otra persona de la unidad.</Text>
          ) : null}
        </View>

        <FormFooter error={general}>
          <Button variant="secondary" label="Cancelar" onPress={volver} disabled={enviando} />
          <Button
            label={editando ? "Guardar cambios" : "Agregar a la unidad"}
            onPress={guardar}
            loading={enviando}
            testID="persona-guardar"
          />
        </FormFooter>
        {editando ? (
          <View style={s.quitar}>
            <ConfirmButton
              variant="danger"
              label="Quitar de la unidad"
              question={`¿Quitar a ${persona?.nombre ?? "esta persona"} de la unidad ${unidad.numero}?`}
              confirmLabel="Sí, quitar"
              onConfirm={quitar}
            />
          </View>
        ) : null}
      </Card>
    </>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    celda: { flexGrow: 1, flexBasis: 200 },
    casilla: { gap: t.space.xs },
    quitar: { alignSelf: "flex-start" },
  });
