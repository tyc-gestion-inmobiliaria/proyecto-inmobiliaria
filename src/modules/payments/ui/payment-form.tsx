/**
 * Registrar un pago desde la ficha de la unidad (PB-28): monto, fecha,
 * cuenta y operación, en un diálogo para no salir de la ficha.
 *
 * - Obligatorio con asterisco; ejemplo del formato en cada campo; el error
 *   junto al campo. Desde el primer intento, cada cambio se vuelve a
 *   comprobar (validación en línea).
 * - La clave del envío nace al abrir el diálogo y se conserva en cada
 *   reintento: si la red se corta después de guardar, volver a pulsar no
 *   registra el pago dos veces.
 */
import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";

import { CampoDeOpciones } from "@/shared/ui/pieces";
import { Button, Dialog, ErrorSummary, FormFooter, TextField, useStyles, type Tema } from "@/ui";

import { nuevaClave, registrarPago } from "../application/use-cases";
import type { CuentaDestino, PagosPuerto } from "../application/ports";
import { datosVacios, hoyEnLima, listaDeErrores, validarPago, type CampoDelPago, type DatosDelPago, type ErroresDelPago } from "../domain/form";

const SIN_CUENTA = "sin-cuenta";

export function FormularioDePago({
  pagos,
  orgId,
  unidadId,
  unidadNumero,
  cuentas,
  onCerrar,
  onRegistrado,
}: {
  pagos: PagosPuerto;
  orgId: string;
  unidadId: string;
  unidadNumero?: string;
  cuentas: readonly CuentaDestino[];
  onCerrar: () => void;
  onRegistrado: () => void;
}) {
  const s = useStyles(makeStyles);
  const hoy = hoyEnLima();
  const [clave] = useState(nuevaClave);
  const [datos, setDatos] = useState<DatosDelPago>(() => ({ ...datosVacios(hoy), cuentaId: cuentas.length === 1 ? cuentas[0].id : undefined }));
  const [errores, setErrores] = useState<ErroresDelPago>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const refMonto = useRef<TextInput>(null);
  const refFecha = useRef<TextInput>(null);
  const refOperacion = useRef<TextInput>(null);
  const foco: Partial<Record<CampoDelPago, () => void>> = {
    monto: () => refMonto.current?.focus(),
    fecha: () => refFecha.current?.focus(),
    operacion: () => refOperacion.current?.focus(),
  };

  function cambiar(campo: keyof DatosDelPago, valor: string | undefined) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    if (intentos > 0) {
      const v = validarPago(nuevos, { origen: "registrado", hoy, cuentas });
      setErrores(v.ok ? {} : v.errores);
    }
  }

  async function registrar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await registrarPago(pagos, { orgId, unidadId, datos, clave, cuentas, hoy });
    setEnviando(false);
    if (r.ok) return onRegistrado();
    if (r.errores) {
      setErrores(r.errores);
      setIntentos((n) => n + 1);
      return;
    }
    setGeneral(r.general);
  }

  const lista = listaDeErrores(errores);

  return (
    <Dialog visible title={unidadNumero ? `Registrar pago · Unidad ${unidadNumero}` : "Registrar pago"} onClose={onCerrar} width={560}>
      <ErrorSummary
        title={lista.length === 1 ? "Corrige 1 campo para registrar" : `Corrige ${lista.length} campos para registrar`}
        focusKey={intentos}
        items={lista.map((e) => ({ key: e.campo, label: e.etiqueta, message: e.mensaje, onPress: foco[e.campo] }))}
      />
      <View style={s.fila}>
        <View style={s.celda}>
          <TextField
            inputRef={refMonto}
            label="Monto (S/)"
            required
            autoFocus
            value={datos.monto}
            onChangeText={(v) => cambiar("monto", v)}
            placeholder="Ej.: 350,50"
            keyboardType="decimal-pad"
            error={errores.monto}
            testID="pago-monto"
          />
        </View>
        <View style={s.celda}>
          <TextField
            inputRef={refFecha}
            label="Fecha del pago"
            required
            value={datos.fecha}
            onChangeText={(v) => cambiar("fecha", v)}
            placeholder="Ej.: 15/10/2026"
            keyboardType="numbers-and-punctuation"
            error={errores.fecha}
            testID="pago-fecha"
          />
        </View>
      </View>
      <CampoDeOpciones
        label="Cuenta donde se depositó"
        value={datos.cuentaId ?? SIN_CUENTA}
        onChange={(id) => cambiar("cuentaId", id === SIN_CUENTA || id === undefined ? undefined : id)}
        options={[
          ...cuentas.map((c) => ({ id: c.id, label: `${c.banco} ${c.numero}` })),
          { id: SIN_CUENTA, label: "Efectivo, sin cuenta" },
        ]}
        error={errores.cuenta}
      />
      <TextField
        inputRef={refOperacion}
        label="Número de operación"
        value={datos.operacion}
        onChangeText={(v) => cambiar("operacion", v)}
        placeholder="Ej.: 00123456"
        autoCapitalize="characters"
        helper="Opcional si pagó en efectivo."
        error={errores.operacion}
        onSubmitEditing={registrar}
        testID="pago-operacion"
      />
      <FormFooter error={general}>
        <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
        <Button label="Registrar pago" onPress={registrar} loading={enviando} testID="pago-registrar" />
      </FormFooter>
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    celda: { flexGrow: 1, flexBasis: 200 },
  });
