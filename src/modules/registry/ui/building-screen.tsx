/**
 * Alta y edición de un edificio (PB-07, H9).
 *
 * - Lo obligatorio lleva su asterisco y cada campo un ejemplo del formato.
 * - Al intentar guardar con algo mal, el error aparece junto al campo **y**
 *   un resumen arriba que dice cuántos hay; tocar una línea del resumen lleva
 *   al campo. Desde ese intento, cada campo se vuelve a comprobar al
 *   escribir, para que el error se vaya en cuanto se corrige.
 * - El nombre repetido que rechaza la base cae en el campo Nombre; lo que no
 *   es de un campo (red, permiso) va sobre los botones.
 * - Guardado, vuelve a la lista, que se lee de nuevo y lo muestra.
 */
import { router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type TextInput } from "react-native";

import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import { Button, Card, EmptyState, ErrorSummary, FormFooter, PageHeader, TextField, useStyles, type Tema } from "@/ui";

import { guardarEdificio } from "../application/save-building";
import type { EdificiosPuerto } from "../application/ports";
import {
  LARGO_MAXIMO,
  listaDeErrores,
  puedeEditarEdificios,
  validarEdificio,
  type CampoEdificio,
  type DatosEdificio,
  type Edificio,
  type ErroresEdificio,
} from "../domain/building";
import { useEdificios } from "./use-buildings";

const volverALaLista = () => router.navigate("/buildings");

/** Sin `id`, el alta; con `id`, la edición de ese edificio. */
export function PantallaEdificio({ edificios, id }: { edificios: EdificiosPuerto; id?: string }) {
  const s = useStyles(makeStyles);
  return (
    <ConOrganizacion>
      {(enCurso) =>
        puedeEditarEdificios(enCurso.rol) ? (
          <Formulario key={`${enCurso.orgId}-${id ?? "nuevo"}`} orgId={enCurso.orgId} id={id} puerto={edificios} />
        ) : (
          <ScrollView contentContainerStyle={s.pantalla}>
            <EmptyState
              icon="lock"
              title="Tu rol no permite registrar ni editar edificios"
              description="Pídeselo a un administrador de tu empresa."
              action={<Button variant="secondary" label="Volver a edificios" onPress={volverALaLista} />}
            />
          </ScrollView>
        )
      }
    </ConOrganizacion>
  );
}

function Formulario({ orgId, id, puerto }: { orgId: string; id?: string; puerto: EdificiosPuerto }) {
  const s = useStyles(makeStyles);
  // La lista sirve para dos cosas: encontrar el que se edita y avisar del nombre repetido sin ir a la base.
  const { carga, reintentar } = useEdificios(puerto, orgId);

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          icon="refresh-cw"
          title="No se pudieron leer los edificios"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </ScrollView>
    );
  }

  const edificio = id ? carga.edificios.find((e) => e.id === id) : undefined;
  if (id && !edificio) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          icon="building"
          title="Este edificio no está en la cartera"
          action={<Button variant="secondary" label="Volver a edificios" onPress={volverALaLista} />}
        />
      </ScrollView>
    );
  }

  return <Campos orgId={orgId} edificio={edificio} existentes={carga.edificios} puerto={puerto} />;
}

function Campos({
  orgId,
  edificio,
  existentes,
  puerto,
}: {
  orgId: string;
  edificio?: Edificio;
  existentes: Edificio[];
  puerto: EdificiosPuerto;
}) {
  const s = useStyles(makeStyles);
  const [datos, setDatos] = useState<DatosEdificio>({ nombre: edificio?.nombre ?? "", direccion: edificio?.direccion ?? "" });
  const [errores, setErrores] = useState<ErroresEdificio>({});
  const [general, setGeneral] = useState<string | null>(null);
  // Cuántas veces se intentó guardar con errores: el resumen toma el foco en cada una.
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refNombre = useRef<TextInput>(null);
  const refDireccion = useRef<TextInput>(null);
  const refs: Record<CampoEdificio, typeof refNombre> = { nombre: refNombre, direccion: refDireccion };

  function cambiar(campo: CampoEdificio, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    // Después del primer intento, el error se va en cuanto se corrige (y vuelve si se rompe otra vez).
    if (intentosFallidos > 0) setErrores(validarEdificio(nuevos, existentes, edificio?.id));
  }

  async function guardar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await guardarEdificio(puerto, { orgId, datos, existentes, id: edificio?.id });
    setEnviando(false);
    if (r.ok) {
      volverALaLista();
      return;
    }
    setErrores(r.campos);
    setGeneral(r.general ?? null);
    if (listaDeErrores(r.campos).length > 0) setIntentosFallidos((n) => n + 1);
  }

  const lista = listaDeErrores(errores);
  const titulo = edificio ? "Editar edificio" : "Registrar edificio";

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <PageHeader title={titulo} back={{ label: "Edificios", onPress: volverALaLista }} />
        <Card style={s.tarjeta} padding="xl">
          <ErrorSummary
            title={lista.length === 1 ? "Corrige 1 campo para guardar" : `Corrige ${lista.length} campos para guardar`}
            focusKey={intentosFallidos}
            items={lista.map((e) => ({
              key: e.campo,
              label: e.etiqueta,
              message: e.mensaje,
              onPress: () => refs[e.campo].current?.focus(),
            }))}
          />
          <TextField
            inputRef={refNombre}
            label="Nombre"
            required
            value={datos.nombre}
            onChangeText={(v) => cambiar("nombre", v)}
            placeholder="Ej.: Residencial Los Olivos"
            autoCapitalize="words"
            autoFocus={!edificio}
            error={errores.nombre}
            testID="edificio-nombre"
          />
          <TextField
            inputRef={refDireccion}
            label="Dirección"
            value={datos.direccion}
            onChangeText={(v) => cambiar("direccion", v)}
            placeholder="Ej.: Av. Los Álamos 245, Miraflores"
            helper={`Opcional. Hasta ${LARGO_MAXIMO.direccion} caracteres.`}
            error={errores.direccion}
            onSubmitEditing={guardar}
            testID="edificio-direccion"
          />
          <FormFooter error={general}>
            <Button variant="secondary" label="Cancelar" onPress={volverALaLista} disabled={enviando} />
            <Button
              label={edificio ? "Guardar cambios" : "Registrar edificio"}
              onPress={guardar}
              loading={enviando}
              testID="edificio-guardar"
            />
          </FormFooter>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 960, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
  });
