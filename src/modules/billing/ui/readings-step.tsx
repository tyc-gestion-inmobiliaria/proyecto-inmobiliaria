/**
 * Paso 1: las lecturas de agua de cada unidad, con su foto (PB-14).
 *
 * - Cada fila trae la lectura anterior y calcula el consumo mientras se
 *   escribe la actual. Se guarda sola, un momento después de dejar de
 *   escribir; "Guardar borrador" termina lo pendiente.
 * - El aviso va en la fila con su causa: vacía, menor que la anterior, o sin
 *   anterior. La menor no se guarda (el medidor no retrocede).
 * - La foto va al bucket privado de la administradora. Sin foto, la fila
 *   ofrece adjuntarla; con foto, verla, y desde la vista, cambiarla.
 * - Arriba, el monto del recibo de agua del edificio, que se reparte por
 *   consumo, y cuántas unidades tienen lectura, con sus casillas.
 * - "Sin lectura" deja las que faltaban al elegirlo: una fila no desaparece
 *   mientras se le escribe la lectura.
 * - Si la tomó alguien en el edificio (PB-29), la fila dice quién y cuándo.
 * - En el teléfono la anterior va como dato bajo el número de la unidad, para
 *   que la actual tenga ancho. Se vuelve campo cuando falta o cuando hay que
 *   corregirla ("Corregir anterior").
 */
import * as ImagePicker from "expo-image-picker";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  Button,
  Card,
  ChoiceChips,
  DataTable,
  Dialog,
  Meter,
  TableHead,
  TableRow,
  TdView,
  TextField,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { guardarLectura, mensajeDeCobranza } from "../application/use-cases";
import type { CobranzaPuerto } from "../application/ports";
import type { Cierre } from "../domain/closing";
import { leerMonto, textoDeSoles } from "../domain/money";
import { avanceDeLecturas, avisoDeLectura, consumo, leerMedida, textoDeMetros, type Lectura } from "../domain/reading";
import type { PasoAbierto } from "./step";

const ESPERA_AL_ESCRIBIR = 700;

/** Por debajo de este ancho de ventana, la lectura anterior va como dato y no como campo. */
const ANCHO_ANGOSTO = 720;

interface Texto {
  anterior: string;
  actual: string;
}

const aTexto = (n: number | null) => (n === null ? "" : String(n));

/** "24/10, 10:32" en la hora de Lima. */
function textoDeMomento(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

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
  const angosto = useWindowDimensions().width < ANCHO_ANGOSTO;
  const [textos, setTextos] = useState<Record<string, Texto>>(() =>
    Object.fromEntries(lecturas.map((l) => [l.id, { anterior: aTexto(l.anterior), actual: aTexto(l.actual) }])),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [montoAgua, setMontoAgua] = useState(cierre.montoAgua > 0 ? cierre.montoAgua.toFixed(2) : "");
  const [errorAgua, setErrorAgua] = useState<string | null>(null);
  const [foto, setFoto] = useState<{ lectura: Lectura; url: string | null } | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<{ tipo: "todas" } | { tipo: "faltan"; ids: Set<string> }>({ tipo: "todas" });
  const [anteriorAbierta, setAnteriorAbierta] = useState<Set<string>>(
    () => new Set(lecturas.filter((l) => l.anterior === null).map((l) => l.id)),
  );
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
    setFoto({ lectura: l, url: null });
    setFoto({ lectura: l, url: await cobranza.urlDeFoto(l.foto) });
  }

  const avance = avanceDeLecturas(lecturas.map((l) => ({ actual: leerMedida(textos[l.id]?.actual ?? "") === null ? null : 1 })));
  const sinLectura = lecturas.filter((l) => leerMedida(textos[l.id]?.actual ?? "") === null);
  const visibles = filtro.tipo === "faltan" ? lecturas.filter((l) => filtro.ids.has(l.id)) : lecturas;

  const botonDeFoto = (l: Lectura) => {
    if (l.foto) {
      return (
        <Button
          variant="ghost"
          size="sm"
          icon="image"
          iconOnly={angosto}
          label="Ver foto"
          accessibilityLabel={`Ver la foto del medidor de la unidad ${l.unidadNumero}`}
          onPress={() => ver(l)}
        />
      );
    }
    if (!editable) return null;
    return (
      <Button
        variant="secondary"
        size="sm"
        icon="camera"
        iconOnly={angosto}
        label="Adjuntar foto"
        accessibilityLabel={`Adjuntar la foto del medidor de la unidad ${l.unidadNumero}`}
        loading={subiendo === l.id}
        onPress={() => adjuntar(l)}
      />
    );
  };

  return (
    <View style={s.paso}>
      <Card padding="lg" style={s.arriba}>
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
            <>
              <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Recibo de agua del edificio</Text>
              <Text style={textStyle(t, "title")}>{textoDeSoles(cierre.montoAgua)}</Text>
            </>
          )}
        </View>
        <View style={s.avance} accessibilityLiveRegion="polite" accessible accessibilityLabel={avance.texto}>
          <Text style={textStyle(t, "title")}>
            {avance.con}
            <Text style={textStyle(t, "subtitle", t.color.text.secondary)}>{` de ${avance.total}`}</Text>
          </Text>
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>unidades con lectura</Text>
          <Meter value={avance.con} total={avance.total} unit="unidades con lectura" label="" />
        </View>
      </Card>

      <ChoiceChips
        accessibilityLabel="Qué unidades mostrar"
        value={filtro.tipo}
        onChange={(v) => {
          if (v === "faltan") setFiltro({ tipo: "faltan", ids: new Set(sinLectura.map((l) => l.id)) });
          else if (v === "todas") setFiltro({ tipo: "todas" });
        }}
        options={[
          { id: "todas", label: `Todas (${lecturas.length})` },
          { id: "faltan", label: `Sin lectura (${sinLectura.length})` },
        ]}
      />

      <DataTable minWidth={0}>
        <TableHead>
          <Th flex={angosto ? 1 : 0.7}>Unidad</Th>
          {angosto ? null : <Th flex={1}>Anterior</Th>}
          <Th flex={angosto ? 1.3 : 1}>Actual</Th>
          <Th flex={0.8} align="right">
            Consumo
          </Th>
          <View style={angosto ? s.colFotoAngosta : s.colFoto} />
        </TableHead>
        {visibles.map((l) => {
          const texto = textos[l.id] ?? { anterior: "", actual: "" };
          const anterior = leerMedida(texto.anterior);
          const actual = leerMedida(texto.actual);
          const aviso = avisoDeLectura(anterior, actual);
          const error = errores[l.id];
          const bloquea = Boolean(error || aviso?.bloquea);
          const c = typeof anterior === "number" && typeof actual === "number" ? consumo(anterior, actual) : null;
          const anteriorEnLinea = angosto && editable && anteriorAbierta.has(l.id);
          const campoAnterior = (
            <TextField
              label={angosto ? "Lectura anterior" : undefined}
              value={texto.anterior}
              onChangeText={(v) => cambiar(l.id, "anterior", v)}
              keyboardType="decimal-pad"
              mono
              accessibilityLabel={`Lectura anterior de la unidad ${l.unidadNumero}`}
            />
          );
          return (
            <TableRow key={l.id}>
              <TdView flex={1} style={s.fila}>
                <View style={s.celdas}>
                  <View style={[s.unidad, { flex: angosto ? 1 : 0.7 }]}>
                    <Text style={textStyle(t, "subtitle")}>{l.unidadNumero}</Text>
                    {angosto && !anteriorEnLinea ? (
                      <Text style={textStyle(t, "caption", t.color.text.secondary)}>{`Ant. ${textoDeMetros(typeof anterior === "number" ? anterior : null)}`}</Text>
                    ) : null}
                  </View>
                  {angosto ? null : (
                    <View style={s.celda}>
                      {editable ? campoAnterior : <Text style={textStyle(t, "data")}>{textoDeMetros(l.anterior)}</Text>}
                    </View>
                  )}
                  <View style={[s.celda, { flex: angosto ? 1.3 : 1 }]}>
                    {editable ? (
                      <TextField
                        value={texto.actual}
                        onChangeText={(v) => cambiar(l.id, "actual", v)}
                        keyboardType="decimal-pad"
                        mono
                        accessibilityLabel={`Lectura actual de la unidad ${l.unidadNumero}`}
                        testID={`lectura-${l.unidadNumero}`}
                      />
                    ) : (
                      <Text style={textStyle(t, "data")}>{textoDeMetros(l.actual)}</Text>
                    )}
                  </View>
                  <Text style={[textStyle(t, "data", c === null ? t.color.text.tertiary : t.color.text.primary), s.consumo]}>
                    {angosto ? (c === null ? "—" : String(c)) : textoDeMetros(c)}
                  </Text>
                  <View style={angosto ? s.colFotoAngosta : s.colFoto}>{botonDeFoto(l)}</View>
                </View>
                {anteriorEnLinea ? <View style={s.anteriorEnLinea}>{campoAnterior}</View> : null}
                {l.tomadaEn ? (
                  <Text style={textStyle(t, "caption", t.color.text.secondary)}>
                    {`Tomada${l.tomadaPor ? ` por ${l.tomadaPor}` : ""} el ${textoDeMomento(l.tomadaEn)}`}
                  </Text>
                ) : null}
                {error || aviso ? (
                  <View style={s.aviso}>
                    <Text
                      accessibilityRole={bloquea ? "alert" : undefined}
                      style={[textStyle(t, "caption", bloquea ? t.color.danger.fg : t.color.warning.fg), s.avisoTexto]}
                    >
                      {`${bloquea ? "!" : "⚠"} ${error ?? aviso?.texto}`}
                    </Text>
                    {angosto && editable && aviso?.bloquea && !anteriorEnLinea ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        label="Corregir anterior"
                        accessibilityLabel={`Corregir la lectura anterior de la unidad ${l.unidadNumero}`}
                        onPress={() => setAnteriorAbierta((x) => new Set(x).add(l.id))}
                      />
                    ) : null}
                  </View>
                ) : null}
              </TdView>
            </TableRow>
          );
        })}
      </DataTable>
      {visibles.length === 0 ? <Text style={textStyle(t, "body", t.color.text.secondary)}>Todas las unidades tienen lectura.</Text> : null}

      <Dialog
        visible={foto !== null}
        title={foto ? `Medidor de la unidad ${foto.lectura.unidadNumero}` : undefined}
        onClose={() => setFoto(null)}
        width={720}
        footer={
          foto && editable ? (
            <Button
              variant="secondary"
              icon="camera"
              label="Cambiar foto"
              onPress={() => {
                const l = foto.lectura;
                setFoto(null);
                void adjuntar(l);
              }}
            />
          ) : undefined
        }
      >
        {foto?.url ? (
          <Image
            source={{ uri: foto.url }}
            style={s.imagen}
            resizeMode="contain"
            accessibilityLabel={`Foto del medidor de la unidad ${foto.lectura.unidadNumero}`}
          />
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
    arriba: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: t.space.lg },
    agua: { flexGrow: 1, flexBasis: 260, maxWidth: 420, gap: t.space.xxs },
    avance: { flexGrow: 1, flexBasis: 200, maxWidth: 320, gap: t.space.xs },
    fila: { gap: t.space.xs, paddingVertical: t.space.xxs },
    celdas: { flexDirection: "row", alignItems: "center", gap: t.space.md },
    unidad: { gap: t.space.xxs },
    celda: { flex: 1, minWidth: 0 },
    consumo: { flex: 0.8, textAlign: "right" },
    colFoto: { width: 150, alignItems: "flex-end" },
    colFotoAngosta: { width: 44, alignItems: "flex-end" },
    anteriorEnLinea: { maxWidth: 220 },
    aviso: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
    avisoTexto: { flexShrink: 1 },
    imagen: { width: "100%", height: 420 },
  });
