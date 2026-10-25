/**
 * El residente avisa que pagó (PB-26): monto, fecha, cuenta donde depositó,
 * número de operación y la foto del comprobante.
 *
 * - Todo lo que la administración necesita para encontrar el depósito es
 *   obligatorio y lleva asterisco; la foto se pide pero no se exige
 *   (supuesto: hay bancos cuya constancia llega solo por correo).
 * - La foto se elige con la cámara o la galería del teléfono y se ve antes de
 *   enviar; se sube al bucket privado al enviar, no antes.
 * - La clave del envío nace al abrir el diálogo y se conserva en cada
 *   reintento: si la red se corta, volver a enviar no crea dos pagos.
 * - Enviado, queda "Por validar" hasta que la administración lo revise.
 */
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";
import { Image, Platform, StyleSheet, Text, View, type TextInput } from "react-native";

import { CampoDeOpciones } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { Button, Dialog, ErrorSummary, FormFooter, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import { nuevaClave, reportarPago } from "../application/use-cases";
import type { ArchivoDeComprobante, PagosPuerto } from "../application/ports";
import { datosVacios, hoyEnLima, listaDeErrores, validarPago, type CampoDelPago, type DatosDelPago, type ErroresDelPago } from "../domain/form";

export function ReportarPago({
  pagos,
  orgId,
  edificioId,
  unidadId,
  unidadNumero,
  onCerrar,
  onReportado,
}: {
  pagos: PagosPuerto;
  orgId: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  onCerrar: () => void;
  onReportado: () => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const hoy = hoyEnLima();
  const leerCuentas = useCallback(() => pagos.cuentasDelEdificio(orgId, edificioId), [pagos, orgId, edificioId]);
  const { carga } = useCarga(leerCuentas);
  const cuentas = carga.estado === "listo" ? carga.valor : [];
  const [clave] = useState(nuevaClave);
  const [datos, setDatos] = useState<DatosDelPago>(() => datosVacios(hoy));
  const [archivo, setArchivo] = useState<ArchivoDeComprobante | null>(null);
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
  // Con una sola cuenta no hay nada que elegir.
  const cuentaId = datos.cuentaId ?? (cuentas.length === 1 ? cuentas[0].id : undefined);

  function cambiar(campo: keyof DatosDelPago, valor: string | undefined) {
    const nuevos = { ...datos, cuentaId, [campo]: valor };
    setDatos(nuevos);
    if (intentos > 0) {
      const v = validarPago(nuevos, { origen: "reportado", hoy, cuentas });
      setErrores(v.ok ? {} : v.errores);
    }
  }

  async function elegirFoto() {
    const elegida =
      Platform.OS === "web"
        ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 })
        : await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 }).catch(() =>
            ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 }),
          );
    if (elegida.canceled || !elegida.assets[0]) return;
    const a = elegida.assets[0];
    const tipo = a.mimeType ?? "image/jpeg";
    setArchivo({ uri: a.uri, tipo, extension: tipo.split("/")[1] ?? "jpg" });
  }

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setGeneral(null);
    const r = await reportarPago(pagos, { orgId, unidadId, datos: { ...datos, cuentaId }, clave, cuentas, hoy, archivo });
    setEnviando(false);
    if (r.ok) return onReportado();
    if (r.errores) {
      setErrores(r.errores);
      setIntentos((n) => n + 1);
      return;
    }
    setGeneral(r.general);
  }

  const lista = listaDeErrores(errores);

  return (
    <Dialog visible title={`Reportar un pago · Unidad ${unidadNumero}`} onClose={onCerrar} width={560}>
      <ErrorSummary
        title={lista.length === 1 ? "Corrige 1 campo para enviar" : `Corrige ${lista.length} campos para enviar`}
        focusKey={intentos}
        items={lista.map((e) => ({ key: e.campo, label: e.etiqueta, message: e.mensaje, onPress: foco[e.campo] }))}
      />
      <View style={s.fila}>
        <View style={s.celda}>
          <TextField
            inputRef={refMonto}
            label="Monto (S/)"
            required
            value={datos.monto}
            onChangeText={(v) => cambiar("monto", v)}
            placeholder="Ej.: 350.50"
            keyboardType="decimal-pad"
            error={errores.monto}
            testID="reporte-monto"
          />
        </View>
        <View style={s.celda}>
          <TextField
            inputRef={refFecha}
            label="Fecha del depósito"
            required
            value={datos.fecha}
            onChangeText={(v) => cambiar("fecha", v)}
            placeholder="Ej.: 15/10/2026"
            keyboardType="numbers-and-punctuation"
            error={errores.fecha}
            testID="reporte-fecha"
          />
        </View>
      </View>
      {cuentas.length > 1 ? (
        <CampoDeOpciones
          label="Cuenta donde depositaste"
          required
          value={cuentaId}
          onChange={(id) => cambiar("cuentaId", id)}
          options={cuentas.map((c) => ({ id: c.id, label: `${c.banco} ${c.numero}` }))}
          error={errores.cuenta}
        />
      ) : cuentas.length === 1 ? (
        <View style={s.cuenta}>
          <Text style={textStyle(t, "label", t.color.text.secondary)}>Cuenta donde depositaste</Text>
          <Text style={textStyle(t, "body")}>{`${cuentas[0].banco} ${cuentas[0].numero}`}</Text>
          {errores.cuenta ? <Text style={textStyle(t, "caption", t.color.danger.fg)}>{`! ${errores.cuenta}`}</Text> : null}
        </View>
      ) : null}
      <TextField
        inputRef={refOperacion}
        label="Número de operación"
        required
        value={datos.operacion}
        onChangeText={(v) => cambiar("operacion", v)}
        placeholder="Ej.: 00123456"
        autoCapitalize="characters"
        helper="Está en la constancia del banco."
        error={errores.operacion}
        testID="reporte-operacion"
      />
      <View style={s.foto}>
        {archivo ? (
          <Image source={{ uri: archivo.uri }} style={s.vista} resizeMode="cover" accessibilityLabel="Vista previa del comprobante" />
        ) : null}
        <Button
          variant="secondary"
          icon="camera"
          label={archivo ? "Cambiar foto" : "Agregar foto del comprobante"}
          onPress={elegirFoto}
          testID="reporte-foto"
        />
      </View>
      <FormFooter error={general}>
        <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
        <Button label="Enviar pago" onPress={enviar} loading={enviando} testID="reporte-enviar" />
      </FormFooter>
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    fila: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
    celda: { flexGrow: 1, flexBasis: 200 },
    cuenta: { gap: t.space.xxs },
    foto: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.md },
    vista: { width: 72, height: 72, borderRadius: t.radius.sm, backgroundColor: t.color.bg.muted },
  });
