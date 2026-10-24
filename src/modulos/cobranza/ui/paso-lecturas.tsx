/**
 * Paso 1: las lecturas de agua de cada unidad, con su foto (PB-14).
 *
 * - Cada fila trae la lectura anterior y calcula el consumo mientras se
 *   escribe la actual. Se guarda sola, un momento después de dejar de
 *   escribir; "Guardar borrador" termina lo pendiente.
 * - El aviso va en la fila con su causa: vacía, menor que la anterior, o sin
 *   anterior. La menor no se guarda (el medidor no retrocede).
 * - La foto va al bucket privado de la administradora y se amplía al tocarla.
 * - Arriba, el monto del recibo de agua del edificio, que se reparte por
 *   consumo, y cuántas unidades tienen lectura.
 */
import * as ImagePicker from "expo-image-picker";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import {
  Button,
  DataTable,
  Dialog,
  TableRow,
  TdView,
  TextField,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { guardarLectura, mensajeDeCobranza } from "../aplicacion/casos-de-uso";
import type { CobranzaPuerto } from "../aplicacion/puertos";
import type { Cierre } from "../dominio/cierre";
import { leerMonto, textoDeSoles } from "../dominio/dinero";
import { avanceDeLecturas, avisoDeLectura, consumo, leerMedida, textoDeMetros, type Lectura } from "../dominio/lectura";
import type { PasoAbierto } from "./paso";

const ESPERA_AL_ESCRIBIR = 700;

interface Texto {
  anterior: string;
  actual: string;
}

const aTexto = (n: number | null) => (n === null ? "" : String(n));

export const PasoLecturas = forwardRef<
  PasoAbierto,
  {
    cobranza: CobranzaPuerto;
    orgId: string;
    cierre: Cierre;
    lecturas: Lectura[];
    editable: boolean;
    onErrores: (n: number) => void;
    onGuardado: () => void;
  }
>(function PasoLecturas({ cobranza, orgId, cierre, lecturas, editable, onErrores, onGuardado }, ref) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [textos, setTextos] = useState<Record<string, Texto>>(() =>
    Object.fromEntries(lecturas.map((l) => [l.id, { anterior: aTexto(l.anterior), actual: aTexto(l.actual) }])),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [montoAgua, setMontoAgua] = useState(cierre.montoAgua > 0 ? cierre.montoAgua.toFixed(2) : "");
  const [errorAgua, setErrorAgua] = useState<string | null>(null);
  const [foto, setFoto] = useState<{ unidad: string; url: string | null } | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const relojes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendientes = useRef(new Map<string, Promise<boolean>>());

  // Lo que bloquea en una fila (menor, inválida) impide continuar; el padre lo cuenta.
  const conError = new Set([
    ...lecturas
      .filter((l) => avisoDeLectura(leerMedida(textos[l.id]?.anterior ?? ""), leerMedida(textos[l.id]?.actual ?? ""))?.bloquea)
      .map((l) => l.id),
    ...Object.keys(errores),
  ]).size;
  useEffect(() => onErrores(conError), [conError, onErrores]);

  function guardarFila(id: string, texto: Texto): Promise<boolean> {
    const pedido = guardarLectura(cobranza, orgId, id, texto).then((r) => {
      setErrores((e) => {
        const { [id]: _, ...resto } = e;
        return r.ok ? resto : { ...resto, [id]: r.error };
      });
      return r.ok;
    });
    pendientes.current.set(id, pedido);
    void pedido.finally(() => {
      if (pendientes.current.get(id) === pedido) pendientes.current.delete(id);
    });
    return pedido;
  }

  function cambiar(id: string, campo: keyof Texto, valor: string) {
    const nuevo = { ...textos[id], [campo]: valor };
    setTextos((x) => ({ ...x, [id]: nuevo }));
    const reloj = relojes.current.get(id);
    if (reloj) clearTimeout(reloj);
    const aviso = avisoDeLectura(leerMedida(nuevo.anterior), leerMedida(nuevo.actual));
    if (aviso?.bloquea) return;
    relojes.current.set(
      id,
      setTimeout(() => {
        relojes.current.delete(id);
        void guardarFila(id, nuevo);
      }, ESPERA_AL_ESCRIBIR),
    );
  }

  useImperativeHandle(ref, () => ({
    async guardar() {
      // Lo que esperaba su turno se manda ya.
      for (const [id, reloj] of relojes.current) {
        clearTimeout(reloj);
        relojes.current.delete(id);
        void guardarFila(id, textos[id]);
      }
      const filas = await Promise.all(pendientes.current.values());
      const monto = montoAgua.trim() === "" ? 0 : leerMonto(montoAgua);
      if (monto === null) {
        setErrorAgua("Escribe un monto, por ejemplo 350.80");
        return false;
      }
      setErrorAgua(null);
      const r = await cobranza.guardarCierre(orgId, cierre.id, { montoAgua: monto });
      if (!r.ok) setErrorAgua(mensajeDeCobranza(r.fallo));
      onGuardado();
      return r.ok && filas.every(Boolean);
    },
  }));

  async function adjuntar(l: Lectura) {
    const elegida = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (elegida.canceled || !elegida.assets[0]) return;
    const a = elegida.assets[0];
    const tipo = a.mimeType ?? "image/jpeg";
    setSubiendo(l.id);
    const r = await cobranza.subirFoto(orgId, l, cierre.id, { uri: a.uri, tipo, extension: tipo.split("/")[1] ?? "jpg" });
    setSubiendo(null);
    setErrores((e) => {
      const { [l.id]: _, ...resto } = e;
      return r.ok ? resto : { ...resto, [l.id]: `La foto no se guardó: ${mensajeDeCobranza(r.fallo)}` };
    });
    if (r.ok) onGuardado();
  }

  async function ver(l: Lectura) {
    if (!l.foto) return;
    setFoto({ unidad: l.unidadNumero, url: null });
    setFoto({ unidad: l.unidadNumero, url: await cobranza.urlDeFoto(l.foto) });
  }

  const avance = avanceDeLecturas(lecturas.map((l) => ({ actual: leerMedida(textos[l.id]?.actual ?? "") === null ? null : 1 })));

  return (
    <View style={s.paso}>
      <View style={s.arriba}>
        <View style={s.agua}>
          {editable ? (
            <TextField
              label="Recibo de agua del edificio (S/)"
              required
              value={montoAgua}
              onChangeText={setMontoAgua}
              placeholder="Ej.: 350.80"
              keyboardType="decimal-pad"
              helper="Se reparte entre las unidades según lo que consumió cada una."
              error={errorAgua}
              mono
              testID="cierre-monto-agua"
            />
          ) : (
            <Text style={textStyle(t, "body")}>{`Recibo de agua del edificio: ${textoDeSoles(cierre.montoAgua)}`}</Text>
          )}
        </View>
        <Text style={textStyle(t, "subtitle")} accessibilityLiveRegion="polite">
          {avance.texto}
        </Text>
      </View>

      <DataTable minWidth={0}>
        {lecturas.map((l) => {
          const texto = textos[l.id] ?? { anterior: "", actual: "" };
          const anterior = leerMedida(texto.anterior);
          const actual = leerMedida(texto.actual);
          const aviso = avisoDeLectura(anterior, actual);
          const error = errores[l.id];
          const c = typeof anterior === "number" && typeof actual === "number" ? consumo(anterior, actual) : null;
          return (
            <TableRow key={l.id}>
              <TdView flex={1} style={s.fila}>
                <View style={s.celdas}>
                  <Text style={[textStyle(t, "subtitle"), s.unidad]}>{l.unidadNumero}</Text>
                  {editable ? (
                    <>
                      <TextField
                        label="Anterior"
                        value={texto.anterior}
                        onChangeText={(v) => cambiar(l.id, "anterior", v)}
                        keyboardType="decimal-pad"
                        mono
                        style={s.medida}
                        accessibilityLabel={`Lectura anterior de la unidad ${l.unidadNumero}`}
                      />
                      <TextField
                        label="Actual"
                        value={texto.actual}
                        onChangeText={(v) => cambiar(l.id, "actual", v)}
                        keyboardType="decimal-pad"
                        mono
                        style={s.medida}
                        accessibilityLabel={`Lectura actual de la unidad ${l.unidadNumero}`}
                        testID={`lectura-${l.unidadNumero}`}
                      />
                    </>
                  ) : (
                    <Text style={textStyle(t, "data")}>{`${textoDeMetros(l.anterior)} → ${textoDeMetros(l.actual)}`}</Text>
                  )}
                  <View style={s.consumo}>
                    <Text style={textStyle(t, "caption", t.color.text.secondary)}>Consumo</Text>
                    <Text style={textStyle(t, "data")}>{textoDeMetros(c)}</Text>
                  </View>
                  <View style={s.foto}>
                    {l.foto ? (
                      <Button variant="ghost" size="sm" label="Ver foto" accessibilityLabel={`Ver la foto de la unidad ${l.unidadNumero}`} onPress={() => ver(l)} />
                    ) : null}
                    {editable ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        label={l.foto ? "Cambiar foto" : "Adjuntar foto"}
                        accessibilityLabel={`${l.foto ? "Cambiar" : "Adjuntar"} la foto del medidor de la unidad ${l.unidadNumero}`}
                        loading={subiendo === l.id}
                        onPress={() => adjuntar(l)}
                      />
                    ) : null}
                  </View>
                </View>
                {error || aviso ? (
                  <Text
                    accessibilityRole={error || aviso?.bloquea ? "alert" : undefined}
                    style={textStyle(t, "caption", error || aviso?.bloquea ? t.color.danger.fg : t.color.warning.fg)}
                  >
                    {`${error || aviso?.bloquea ? "!" : "⚠"} ${error ?? aviso?.texto}`}
                  </Text>
                ) : null}
              </TdView>
            </TableRow>
          );
        })}
      </DataTable>

      <Dialog visible={foto !== null} title={foto ? `Medidor de la unidad ${foto.unidad}` : undefined} onClose={() => setFoto(null)} width={720}>
        {foto?.url ? (
          <Image source={{ uri: foto.url }} style={s.imagen} resizeMode="contain" accessibilityLabel={`Foto del medidor de la unidad ${foto.unidad}`} />
        ) : (
          <Text style={textStyle(t, "body", t.color.text.secondary)}>{foto && foto.url === null ? "Cargando la foto…" : ""}</Text>
        )}
      </Dialog>
    </View>
  );
});

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    paso: { gap: t.space.lg },
    arriba: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: t.space.md },
    agua: { flexGrow: 1, flexBasis: 280, maxWidth: 420 },
    fila: { gap: t.space.xs, paddingVertical: t.space.xs },
    celdas: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: t.space.md },
    unidad: { minWidth: 56, alignSelf: "center" },
    medida: { width: 120 },
    consumo: { minWidth: 96, gap: t.space.xxs, paddingBottom: t.space.sm },
    foto: { flexDirection: "row", gap: t.space.xs, marginLeft: "auto" },
    imagen: { width: "100%", height: 420 },
  });
