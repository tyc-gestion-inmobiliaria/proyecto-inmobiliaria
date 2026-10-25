/**
 * Invitar a una persona (PB-23): correo, rol y, si es residente, su unidad.
 *
 * - El residente elige edificio, unidad y quién es en ella: una persona que
 *   ya está en el padrón de esa unidad, o una nueva con su nombre y su
 *   relación. Cada campo aparece cuando el anterior tiene valor, para no
 *   pedir de golpe lo que todavía no aplica.
 * - Como en el resto de los formularios: el error junto al campo y un resumen
 *   arriba al intentar enviar; lo que no es de un campo, sobre los botones.
 * - Enviada, vuelve a Usuarios, que lo dice.
 */
import { router } from "expo-router";
import { useCallback, useRef, useState, type RefObject } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type TextInput } from "react-native";

import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { Button, Card, EmptyState, ErrorSummary, FormFooter, PageHeader, Select, TextField, useStyles, type Tema } from "@/ui";

import { invitar } from "../application/invitations";
import type { InvitacionesPuerto, UnidadesParaInvitarPuerto } from "../application/ports";
import {
  listaDeErrores,
  nombreDeLaRelacion,
  PERSONA_NUEVA,
  puedeInvitar,
  RELACIONES,
  validarInvitacion,
  type CampoInvitacion,
  type DatosInvitacion,
  type ErroresInvitacion,
  type Relacion,
} from "../domain/invitation";
import { nombreDelRol, ROLES, type Rol } from "../domain/membership";
import { Cargando, ConOrganizacion } from "./with-organization";
import { direccionDeAceptacion } from "./users-screen";

const volverALaLista = () => router.navigate("/users");

export function PantallaInvitar({
  invitaciones,
  padron,
}: {
  invitaciones: InvitacionesPuerto;
  padron: UnidadesParaInvitarPuerto;
}) {
  const s = useStyles(makeStyles);
  return (
    <ConOrganizacion>
      {(enCurso) =>
        puedeInvitar(enCurso.rol) ? (
          <Formulario key={enCurso.orgId} orgId={enCurso.orgId} invitaciones={invitaciones} padron={padron} />
        ) : (
          <ScrollView contentContainerStyle={s.pantalla}>
            <EmptyState title="Tu rol no permite invitar" description="Pídeselo a un administrador de tu empresa." />
          </ScrollView>
        )
      }
    </ConOrganizacion>
  );
}

function Formulario({
  orgId,
  invitaciones,
  padron,
}: {
  orgId: string;
  invitaciones: InvitacionesPuerto;
  padron: UnidadesParaInvitarPuerto;
}) {
  const s = useStyles(makeStyles);
  const [datos, setDatos] = useState<DatosInvitacion>({ correo: "", nombre: "" });
  const [errores, setErrores] = useState<ErroresInvitacion>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refCorreo = useRef<TextInput>(null);
  const refNombre = useRef<TextInput>(null);

  function cambiar(cambio: Partial<DatosInvitacion>) {
    const nuevos = { ...datos, ...cambio };
    setDatos(nuevos);
    if (intentosFallidos > 0) setErrores(validarInvitacion(nuevos));
  }

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await invitar(invitaciones, { orgId, datos, volverA: direccionDeAceptacion() });
    setEnviando(false);
    if (r.ok) {
      router.navigate({ pathname: "/users", params: { enviada: datos.correo.trim().toLowerCase() } });
      return;
    }
    setErrores(r.campos);
    setGeneral(r.general ?? null);
    if (listaDeErrores(r.campos).length > 0) setIntentosFallidos((n) => n + 1);
  }

  const lista = listaDeErrores(errores);
  const foco: Partial<Record<CampoInvitacion, () => void>> = {
    correo: () => refCorreo.current?.focus(),
    nombre: () => refNombre.current?.focus(),
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <PageHeader title="Invitar" back={{ label: "Usuarios", onPress: volverALaLista }} />
        <Card style={s.tarjeta} padding="xl">
          <ErrorSummary
            title={lista.length === 1 ? "Corrige 1 campo para enviar" : `Corrige ${lista.length} campos para enviar`}
            focusKey={intentosFallidos}
            items={lista.map((e) => ({ key: e.campo, label: e.etiqueta, message: e.mensaje, onPress: foco[e.campo] }))}
          />
          <TextField
            inputRef={refCorreo}
            label="Correo"
            required
            value={datos.correo}
            onChangeText={(v) => cambiar({ correo: v })}
            placeholder="nombre@empresa.pe"
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            error={errores.correo}
            testID="invitar-correo"
          />
          <CampoDeOpciones<Rol>
            label="Rol"
            required
            options={ROLES.map((r) => ({ id: r, label: nombreDelRol(r) }))}
            value={datos.rol}
            onChange={(rol) => cambiar({ rol })}
            error={errores.rol}
          />
          {datos.rol === "residente" ? (
            <UnidadDelResidente orgId={orgId} padron={padron} datos={datos} errores={errores} cambiar={cambiar} refNombre={refNombre} />
          ) : null}
          <FormFooter error={general}>
            <Button variant="secondary" label="Cancelar" onPress={volverALaLista} disabled={enviando} />
            <Button label="Enviar invitación" onPress={enviar} loading={enviando} testID="invitar-enviar" />
          </FormFooter>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UnidadDelResidente({
  orgId,
  padron,
  datos,
  errores,
  cambiar,
  refNombre,
}: {
  orgId: string;
  padron: UnidadesParaInvitarPuerto;
  datos: DatosInvitacion;
  errores: ErroresInvitacion;
  cambiar: (c: Partial<DatosInvitacion>) => void;
  refNombre: RefObject<TextInput | null>;
}) {
  const leerEdificios = useCallback(() => padron.edificios(orgId), [padron, orgId]);
  const { carga: edificios, reintentar } = useCarga(leerEdificios);

  if (edificios.estado === "cargando") return <Cargando />;
  if (edificios.estado === "error") {
    return (
      <EmptyState
        title="No se pudieron leer los edificios"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" variant="secondary" onPress={reintentar} />}
      />
    );
  }
  if (edificios.valor.length === 0) {
    return <EmptyState title="Todavía no hay edificios registrados" description="Registra el edificio y sus unidades para invitar a un residente." />;
  }

  return (
    <>
      <Select
        label="Edificio"
        required
        placeholder="Elige el edificio"
        accessibilityLabel="Edificio"
        value={datos.edificioId}
        options={edificios.valor.map((e) => ({ id: e.id, label: e.nombre }))}
        onChange={(edificioId) => cambiar({ edificioId, unidadId: undefined, personaId: undefined })}
        error={errores.edificio}
      />
      {datos.edificioId ? (
        <Unidades
          key={datos.edificioId}
          orgId={orgId}
          edificioId={datos.edificioId}
          padron={padron}
          datos={datos}
          errores={errores}
          cambiar={cambiar}
          refNombre={refNombre}
        />
      ) : null}
    </>
  );
}

function Unidades({
  orgId,
  edificioId,
  padron,
  datos,
  errores,
  cambiar,
  refNombre,
}: {
  orgId: string;
  edificioId: string;
  padron: UnidadesParaInvitarPuerto;
  datos: DatosInvitacion;
  errores: ErroresInvitacion;
  cambiar: (c: Partial<DatosInvitacion>) => void;
  refNombre: RefObject<TextInput | null>;
}) {
  const leer = useCallback(() => padron.unidades(orgId, edificioId), [padron, orgId, edificioId]);
  const { carga, reintentar } = useCarga(leer);

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <EmptyState
        title="No se pudieron leer las unidades"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" variant="secondary" onPress={reintentar} />}
      />
    );
  }
  if (carga.valor.length === 0) {
    return <EmptyState title="Este edificio no tiene unidades registradas" description="Regístralas para invitar a un residente." />;
  }

  return (
    <>
      <Select
        label="Unidad"
        required
        placeholder="Elige la unidad"
        accessibilityLabel="Unidad"
        value={datos.unidadId}
        options={carga.valor.map((u) => ({ id: u.id, label: u.numero }))}
        onChange={(unidadId) => cambiar({ unidadId, personaId: undefined })}
        error={errores.unidad}
      />
      {datos.unidadId ? (
        <Persona
          key={datos.unidadId}
          orgId={orgId}
          unidadId={datos.unidadId}
          padron={padron}
          datos={datos}
          errores={errores}
          cambiar={cambiar}
          refNombre={refNombre}
        />
      ) : null}
    </>
  );
}

function Persona({
  orgId,
  unidadId,
  padron,
  datos,
  errores,
  cambiar,
  refNombre,
}: {
  orgId: string;
  unidadId: string;
  padron: UnidadesParaInvitarPuerto;
  datos: DatosInvitacion;
  errores: ErroresInvitacion;
  cambiar: (c: Partial<DatosInvitacion>) => void;
  refNombre: RefObject<TextInput | null>;
}) {
  const leer = useCallback(() => padron.personas(orgId, unidadId), [padron, orgId, unidadId]);
  const { carga, reintentar } = useCarga(leer);

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <EmptyState
        title="No se pudieron leer las personas de la unidad"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" variant="secondary" onPress={reintentar} />}
      />
    );
  }

  // Quien ya tiene cuenta no se puede ligar a otra: no se ofrece.
  const opciones = [
    ...carga.valor.filter((p) => !p.tieneCuenta).map((p) => ({ id: p.id, label: p.nombre })),
    { id: PERSONA_NUEVA, label: "Otra persona (nueva en el padrón)" },
  ];

  return (
    <>
      <Select
        label="Persona"
        required
        placeholder="Elige quién es"
        accessibilityLabel="Persona"
        value={datos.personaId}
        options={opciones}
        onChange={(personaId) => cambiar({ personaId })}
        error={errores.persona}
      />
      {datos.personaId === PERSONA_NUEVA ? (
        <>
          <TextField
            inputRef={refNombre}
            label="Nombre"
            required
            value={datos.nombre}
            onChangeText={(nombre) => cambiar({ nombre })}
            placeholder="Nombre y apellido"
            autoCapitalize="words"
            error={errores.nombre}
            testID="invitar-nombre"
          />
          <CampoDeOpciones<Relacion>
            label="Relación con la unidad"
            required
            options={RELACIONES.map((r) => ({ id: r, label: nombreDeLaRelacion(r) }))}
            value={datos.relacion}
            onChange={(relacion) => cambiar({ relacion })}
            error={errores.relacion}
          />
        </>
      ) : null}
    </>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
  });
