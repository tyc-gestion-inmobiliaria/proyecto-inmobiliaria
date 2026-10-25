/**
 * El recorrido de lecturas en el edificio (PB-29): el personal pasa por las
 * unidades con el teléfono y carga cada lectura con su foto.
 *
 * - **Una unidad a la vez**, con la lectura grande y el teclado numérico:
 *   se trabaja de pie, frente al medidor. El consumo aparece al escribir y
 *   el aviso de "menor que la anterior" va en el campo, con su signo.
 * - **"Guardar y seguir"** guarda y pasa a la próxima sin lectura, en el
 *   orden del edificio. Si la red falla, la lectura escrita sigue en el
 *   campo para reintentar: no se pierde, y guardarla dos veces no duplica
 *   (es la misma fila).
 * - **La foto** abre la cámara del teléfono (en la web, el selector de
 *   archivos) y se sube al bucket privado de la administradora.
 * - **Debajo, todas las unidades** con su estado en palabras; tocar una la
 *   abre arriba, para corregir o saltar.
 * - Solo con un cierre del mes en borrador: sin cierre, o ya emitido, se
 *   dice qué pasa y quién puede hacer algo.
 *
 * Usa los casos de uso de lecturas de la cobranza: el guardado y sus reglas
 * son de allá.
 */
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useCarga } from "@/shared/ui/use-load";
import { guardarLectura, mensajeDeCobranza } from "@/modules/billing/application/use-cases";
import type { CobranzaPuerto } from "@/modules/billing/application/ports";
import type { Cierre } from "@/modules/billing/domain/closing";
import { avisoDeLectura, consumo, leerMedida, textoDeMetros, type Lectura } from "@/modules/billing/domain/reading";
import { hoyEnLima, periodoDe, textoCortoDePeriodo } from "@/modules/billing/domain/period";
import { Cargando, ConOrganizacion } from "@/modules/organizations/ui/with-organization";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Meter,
  PageHeader,
  SectionTitle,
  StatusDot,
  TableRow,
  TdView,
  TextField,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { avanceDelRecorrido, ordenDelRecorrido, siguientePendiente } from "../domain/rounds";

/** Desde este ancho, la unidad en curso y la lista van lado a lado. */
const ANCHO_DOS_COLUMNAS = 960;

export function PantallaRecorrido({ cobranza, edificioId }: { cobranza: CobranzaPuerto; edificioId: string }) {
  return (
    <ConOrganizacion>
      {(enCurso) => <Recorrido key={`${enCurso.orgId}-${edificioId}`} cobranza={cobranza} orgId={enCurso.orgId} edificioId={edificioId} />}
    </ConOrganizacion>
  );
}

interface Datos {
  edificio: string;
  cierre: Cierre | null;
  lecturas: Lectura[];
}

function Recorrido({ cobranza, orgId, edificioId }: { cobranza: CobranzaPuerto; orgId: string; edificioId: string }) {
  const s = useStyles(makeStyles);
  const periodo = periodoDe(hoyEnLima());
  const leer = useCallback(async (): Promise<Datos> => {
    const [edificio, cierre] = await Promise.all([cobranza.edificio(orgId, edificioId), cobranza.cierreDelPeriodo(orgId, edificioId, periodo)]);
    const lecturas = cierre && cierre.estado === "borrador" ? await cobranza.lecturas(orgId, cierre.id) : [];
    return { edificio: edificio?.nombre ?? "", cierre, lecturas };
  }, [cobranza, orgId, edificioId, periodo]);
  const { carga, reintentar } = useCarga(leer);

  if (carga.estado === "cargando") return <Cargando />;

  let vacio = null;
  if (carga.estado === "error") {
    vacio = (
      <EmptyState
        icon="refresh-cw"
        title="No se pudieron leer las lecturas"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button label="Reintentar" onPress={reintentar} />}
      />
    );
  } else if (!carga.valor.cierre) {
    vacio = (
      <EmptyState
        icon="droplet"
        title={`El cierre de ${textoCortoDePeriodo(periodo).toLowerCase()} no está abierto`}
        description="Lo abre un administrador en Cobranza; después aparecen aquí las unidades."
      />
    );
  } else if (carga.valor.cierre.estado === "emitido") {
    vacio = <EmptyState icon="check-circle" title="Las lecturas del mes ya se cerraron" description="Los recibos de este mes ya se emitieron." />;
  }

  if (vacio || carga.estado !== "listo" || !carga.valor.cierre) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <PageHeader title="Lecturas" />
        {vacio}
      </ScrollView>
    );
  }

  return (
    <EnCurso
      cobranza={cobranza}
      orgId={orgId}
      edificio={carga.valor.edificio}
      cierre={carga.valor.cierre}
      inicial={carga.valor.lecturas}
      periodo={periodo}
    />
  );
}

function EnCurso({
  cobranza,
  orgId,
  edificio,
  cierre,
  inicial,
  periodo,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  edificio: string;
  cierre: Cierre;
  inicial: Lectura[];
  periodo: string;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const ancho = useWindowDimensions().width >= ANCHO_DOS_COLUMNAS;
  const [lecturas, setLecturas] = useState(() => ordenDelRecorrido(inicial));
  const [abiertaId, setAbiertaId] = useState<string | null>(() => siguientePendiente(inicial)?.id ?? inicial[0]?.id ?? null);
  const avance = avanceDelRecorrido(lecturas);
  const abierta = lecturas.find((l) => l.id === abiertaId) ?? null;

  const actualizar = (l: Lectura) => setLecturas((xs) => xs.map((x) => (x.id === l.id ? l : x)));

  if (lecturas.length === 0) {
    return (
      <ScrollView contentContainerStyle={s.pantalla}>
        <PageHeader title="Lecturas" />
        <EmptyState icon="door" title="Este edificio no tiene unidades" />
      </ScrollView>
    );
  }

  const tarjeta = abierta ? (
    <UnidadEnCurso
      key={abierta.id}
      cobranza={cobranza}
      orgId={orgId}
      cierreId={cierre.id}
      lectura={abierta}
      onGuardada={(l) => {
        actualizar(l);
        const siguiente = siguientePendiente(lecturas.map((x) => (x.id === l.id ? l : x)), l.id);
        setAbiertaId(siguiente?.id ?? null);
      }}
      onFoto={actualizar}
    />
  ) : (
    <Card padding="lg" style={s.tarjeta}>
      <StatusDot tone="success" label="Todas las unidades tienen lectura" />
      <Text style={textStyle(t, "body", t.color.text.secondary)}>Toca una unidad de la lista para corregirla.</Text>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={s.pantalla} keyboardShouldPersistTaps="handled">
      <PageHeader title="Lecturas" status={<Badge label={`${edificio} · ${textoCortoDePeriodo(periodo)}`} />} />
      <View style={s.avance} accessible accessibilityLabel={`${avance.texto} unidades con lectura`} accessibilityLiveRegion="polite">
        <Text style={textStyle(t, "title")}>
          {avance.hechas}
          <Text style={textStyle(t, "subtitle", t.color.text.secondary)}>{` de ${avance.total}`}</Text>
        </Text>
        <Meter value={avance.hechas} total={avance.total} unit="unidades con lectura" label={avance.faltan > 0 ? `faltan ${avance.faltan}` : "completo"} />
      </View>
      <View style={ancho ? s.columnas : s.columna}>
        <View style={ancho ? s.principal : undefined}>{tarjeta}</View>
        <View style={[s.columna, ancho ? s.lateral : undefined]}>
          <SectionTitle>Unidades</SectionTitle>
          <DataTable minWidth={0}>
            {lecturas.map((l) => (
              <TableRow
                key={l.id}
                selected={l.id === abiertaId}
                onPress={() => setAbiertaId(l.id)}
                accessibilityLabel={`Unidad ${l.unidadNumero}: ${l.actual === null ? "sin lectura" : textoDeMetros(l.actual)}`}
              >
                <TdView flex={1}>
                  <Text style={textStyle(t, "subtitle")}>{l.unidadNumero}</Text>
                </TdView>
                <TdView flex={1.4} style={s.estado}>
                  {l.actual === null ? (
                    <StatusDot tone="warning" label="Sin lectura" />
                  ) : (
                    <StatusDot tone="success" label={`✓ ${textoDeMetros(l.actual)}`} />
                  )}
                  {l.foto ? <Text style={textStyle(t, "caption", t.color.text.secondary)}>con foto</Text> : null}
                </TdView>
              </TableRow>
            ))}
          </DataTable>
        </View>
      </View>
    </ScrollView>
  );
}

function UnidadEnCurso({
  cobranza,
  orgId,
  cierreId,
  lectura,
  onGuardada,
  onFoto,
}: {
  cobranza: CobranzaPuerto;
  orgId: string;
  cierreId: string;
  lectura: Lectura;
  onGuardada: (l: Lectura) => void;
  onFoto: (l: Lectura) => void;
}) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [actual, setActual] = useState(lectura.actual === null ? "" : String(lectura.actual));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [falloFoto, setFalloFoto] = useState<string | null>(null);

  const leida = leerMedida(actual);
  const aviso = avisoDeLectura(lectura.anterior, leida);
  const bloquea = aviso?.bloquea ?? false;
  const c = typeof leida === "number" ? consumo(lectura.anterior, leida) : null;

  async function guardar() {
    if (guardando) return;
    if (leida === null) {
      setError("Escribe la lectura del medidor");
      return;
    }
    setGuardando(true);
    setError(null);
    const r = await guardarLectura(cobranza, orgId, lectura.id, {
      anterior: lectura.anterior === null ? "" : String(lectura.anterior),
      actual,
    });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    onGuardada({ ...lectura, actual: leida as number });
  }

  async function foto() {
    setFalloFoto(null);
    // En el teléfono, la cámara; en la web no hay cámara que abrir desde acá: el selector de archivos.
    let elegida: ImagePicker.ImagePickerResult;
    if (Platform.OS === "web") {
      elegida = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    } else {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return setFalloFoto("Sin permiso para la cámara: actívalo en los ajustes del teléfono.");
      elegida = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    }
    if (elegida.canceled || !elegida.assets[0]) return;
    const a = elegida.assets[0];
    const tipo = a.mimeType ?? "image/jpeg";
    setSubiendo(true);
    const r = await cobranza.subirFoto(orgId, lectura, cierreId, { uri: a.uri, tipo, extension: tipo.split("/")[1] ?? "jpg" });
    setSubiendo(false);
    if (!r.ok) return setFalloFoto(`La foto no se guardó: ${mensajeDeCobranza(r.fallo)}`);
    onFoto({ ...lectura, foto: r.valor });
  }

  return (
    <Card padding="lg" style={s.tarjeta}>
      <View style={s.cabeza}>
        <Text accessibilityRole="header" style={textStyle(t, "title")}>{`Unidad ${lectura.unidadNumero}`}</Text>
        <Text style={textStyle(t, "body", t.color.text.secondary)}>{`Anterior: ${textoDeMetros(lectura.anterior)}`}</Text>
      </View>
      <TextField
        label="Lectura actual (m³)"
        required
        value={actual}
        onChangeText={(v) => {
          setActual(v);
          setError(null);
        }}
        placeholder={lectura.anterior === null ? "Ej.: 120" : `Desde ${lectura.anterior}`}
        keyboardType="decimal-pad"
        mono
        autoFocus={Platform.OS === "web"}
        error={error ?? (bloquea ? aviso?.texto : null)}
        helper={c !== null ? `Consumo: ${textoDeMetros(c)}` : aviso && !bloquea && leida !== null ? `⚠ ${aviso.texto}` : undefined}
        onSubmitEditing={guardar}
        accessibilityLabel={`Lectura actual de la unidad ${lectura.unidadNumero}`}
        testID="campo-lectura"
      />
      <View style={s.foto}>
        {lectura.foto ? <StatusDot tone="success" label="✓ Foto guardada" /> : <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>Sin foto</Text>}
        <Button
          variant="secondary"
          size="sm"
          icon="camera"
          label={lectura.foto ? "Cambiar foto" : "Tomar foto"}
          accessibilityLabel={`${lectura.foto ? "Cambiar" : "Tomar"} la foto del medidor de la unidad ${lectura.unidadNumero}`}
          loading={subiendo}
          onPress={foto}
        />
      </View>
      {falloFoto ? (
        <Text accessibilityRole="alert" style={textStyle(t, "caption", t.color.danger.fg)}>
          {`! ${falloFoto}`}
        </Text>
      ) : null}
      <Button label="Guardar y seguir" icon="arrow-right" iconPosition="end" full size="lg" loading={guardando} onPress={guardar} testID="campo-guardar" />
    </Card>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: 1080, width: "100%" },
    avance: { gap: t.space.xs },
    columna: { gap: t.space.md },
    columnas: { flexDirection: "row", alignItems: "flex-start", gap: t.space.lg },
    principal: { flex: 1, minWidth: 0 },
    lateral: { flexBasis: 360, flexGrow: 0, flexShrink: 0 },
    tarjeta: { gap: t.space.md },
    cabeza: { gap: t.space.xxs },
    foto: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.sm },
    estado: { gap: t.space.xxs, alignItems: "flex-end" },
  });
