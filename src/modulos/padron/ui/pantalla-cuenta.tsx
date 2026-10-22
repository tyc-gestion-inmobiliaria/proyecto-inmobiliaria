/**
 * Alta y edición de una cuenta bancaria del edificio, donde se depositan los
 * pagos. El cierre la pide configurada antes de emitir (PB-17).
 *
 * - Igual que el edificio: el error va junto al campo y en un resumen arriba
 *   que lleva a cada uno; desde el primer intento, cada campo se vuelve a
 *   comprobar al escribir.
 * - El número repetido en el edificio se avisa sin ir a la base, y si la base
 *   lo rechaza igual, cae en el mismo campo.
 * - El CCI se escribe como venga (con espacios o guiones) y se dice cuántos
 *   dígitos lleva.
 */
import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type TextInput } from "react-native";

import { Cargando, ConOrganizacion } from "@/modulos/organizaciones/ui/con-organizacion";
import { Button, Card, EmptyState, ErrorSummary, FormFooter, ScreenTitle, TextField, useStyles, type Tema } from "@/ui";

import { guardarCuenta } from "../aplicacion/guardar-cuenta";
import type { CuentasBancariasPuerto } from "../aplicacion/puertos";
import {
  datosDeCuenta,
  digitosDeCci,
  listaDeErroresCuenta,
  MONEDAS,
  nombreDeMoneda,
  validarCuenta,
  type CampoCuenta,
  type CuentaBancaria,
  type DatosCuenta,
  type ErroresCuenta,
  type Moneda,
} from "../dominio/cuenta-bancaria";
import { puedeEditarPadron } from "../dominio/unidad";
import { CampoDeOpciones } from "@/compartido/ui/piezas";
import { irALasUnidades } from "./pantalla-unidades";
import { useCarga } from "@/compartido/ui/usar-carga";

/** Sin `id`, el alta; con `id`, la edición de esa cuenta. */
export function PantallaCuenta({ cuentas, edificioId, id }: { cuentas: CuentasBancariasPuerto; edificioId: string; id?: string }) {
  const s = useStyles(makeStyles);
  const volver = () => irALasUnidades(edificioId);
  return (
    <ConOrganizacion>
      {(enCurso) =>
        puedeEditarPadron(enCurso.rol) ? (
          <Formulario
            key={`${enCurso.orgId}-${edificioId}-${id ?? "nueva"}`}
            orgId={enCurso.orgId}
            edificioId={edificioId}
            id={id}
            puerto={cuentas}
          />
        ) : (
          <ScrollView contentContainerStyle={s.pantalla}>
            <EmptyState
              title="Tu rol no permite registrar ni editar cuentas"
              description="Pídeselo a un administrador de tu empresa."
              action={<Button variant="secondary" label="Volver al edificio" onPress={volver} />}
            />
          </ScrollView>
        )
      }
    </ConOrganizacion>
  );
}

function Formulario({
  orgId,
  edificioId,
  id,
  puerto,
}: {
  orgId: string;
  edificioId: string;
  id?: string;
  puerto: CuentasBancariasPuerto;
}) {
  const s = useStyles(makeStyles);
  const leer = useCallback(() => puerto.delEdificio(orgId, edificioId), [puerto, orgId, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const volver = () => irALasUnidades(edificioId);

  if (carga.estado === "cargando") return <Cargando />;
  if (carga.estado === "error") {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          title="No se pudieron leer las cuentas del edificio"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      </ScrollView>
    );
  }

  const cuenta = id ? carga.valor.find((c) => c.id === id) : undefined;
  if (id && !cuenta) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <EmptyState
          title="Esta cuenta no está en el edificio"
          action={<Button variant="secondary" label="Volver al edificio" onPress={volver} />}
        />
      </ScrollView>
    );
  }

  return <Campos orgId={orgId} edificioId={edificioId} cuenta={cuenta} otras={carga.valor} puerto={puerto} />;
}

function Campos({
  orgId,
  edificioId,
  cuenta,
  otras,
  puerto,
}: {
  orgId: string;
  edificioId: string;
  cuenta?: CuentaBancaria;
  otras: CuentaBancaria[];
  puerto: CuentasBancariasPuerto;
}) {
  const s = useStyles(makeStyles);
  const [datos, setDatos] = useState<DatosCuenta>(() => datosDeCuenta(cuenta));
  const [errores, setErrores] = useState<ErroresCuenta>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refNombre = useRef<TextInput>(null);
  const refBanco = useRef<TextInput>(null);
  const refNumero = useRef<TextInput>(null);
  const refCci = useRef<TextInput>(null);
  const refs: Partial<Record<CampoCuenta, typeof refNombre>> = {
    nombre: refNombre,
    banco: refBanco,
    numero: refNumero,
    cci: refCci,
  };
  const volver = () => irALasUnidades(edificioId);

  function cambiar<K extends CampoCuenta>(campo: K, valor: DatosCuenta[K]) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    if (intentosFallidos > 0) {
      const v = validarCuenta(nuevos, otras, cuenta?.id);
      setErrores(v.ok ? {} : v.errores);
    }
  }

  async function guardar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await guardarCuenta(puerto, { orgId, edificioId, datos, otras, id: cuenta?.id });
    setEnviando(false);
    if (r.ok) {
      volver();
      return;
    }
    setErrores(r.errores);
    setGeneral(r.general ?? null);
    if (listaDeErroresCuenta(r.errores).length > 0) setIntentosFallidos((n) => n + 1);
  }

  const lista = listaDeErroresCuenta(errores);
  const digitos = digitosDeCci(datos.cci);

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
        <Card style={s.tarjeta} padding="xl">
          <ScreenTitle>{cuenta ? "Editar cuenta bancaria" : "Registrar cuenta bancaria"}</ScreenTitle>
          <ErrorSummary
            title={lista.length === 1 ? "Corrige 1 campo para guardar" : `Corrige ${lista.length} campos para guardar`}
            focusKey={intentosFallidos}
            items={lista.map((e) => ({
              key: e.campo,
              label: e.etiqueta,
              message: e.mensaje,
              onPress: () => refs[e.campo]?.current?.focus(),
            }))}
          />
          <TextField
            inputRef={refNombre}
            label="Nombre"
            required
            value={datos.nombre}
            onChangeText={(v) => cambiar("nombre", v)}
            placeholder="Ej.: Cuenta de mantenimiento"
            autoFocus={!cuenta}
            error={errores.nombre}
            testID="cuenta-nombre"
          />
          <TextField
            inputRef={refBanco}
            label="Banco"
            required
            value={datos.banco}
            onChangeText={(v) => cambiar("banco", v)}
            placeholder="Ej.: Banco de Crédito"
            autoCapitalize="words"
            error={errores.banco}
            testID="cuenta-banco"
          />
          <TextField
            inputRef={refNumero}
            label="Número de cuenta"
            required
            value={datos.numero}
            onChangeText={(v) => cambiar("numero", v)}
            placeholder="Ej.: 191-1234567-0-12"
            keyboardType="numbers-and-punctuation"
            error={errores.numero}
            testID="cuenta-numero"
          />
          <TextField
            inputRef={refCci}
            label="CCI"
            value={datos.cci}
            onChangeText={(v) => cambiar("cci", v)}
            placeholder="20 dígitos"
            keyboardType="number-pad"
            helper={digitos > 0 ? `Llevas ${digitos} de 20 dígitos.` : "Opcional. Para transferencias desde otro banco."}
            error={errores.cci}
            testID="cuenta-cci"
          />
          <CampoDeOpciones<Moneda>
            label="Moneda"
            required
            options={MONEDAS.map((m) => ({ id: m, label: nombreDeMoneda(m) }))}
            value={datos.moneda}
            onChange={(m) => m && cambiar("moneda", m)}
            error={errores.moneda}
          />
          <FormFooter error={general}>
            <Button variant="secondary" label="Cancelar" onPress={volver} disabled={enviando} />
            <Button
              label={cuenta ? "Guardar cambios" : "Registrar cuenta"}
              onPress={guardar}
              loading={enviando}
              testID="cuenta-guardar"
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
    pantalla: { flexGrow: 1, gap: t.space.xl, padding: t.space.xl, maxWidth: 960, width: "100%" },
    tarjeta: { width: "100%", maxWidth: 640, gap: t.space.lg },
  });
