/**
 * La portería de un edificio: los paquetes que esperan a su unidad y las
 * visitas de hoy.
 *
 * - Pestaña "Paquetes": los que siguen en portería, el más antiguo primero,
 *   con la unidad grande (es lo que se busca con la caja en la mano). Los
 *   que llevan varios días dicen cuántos, con su signo. "Entregar…" pide
 *   quién lo recoge y lo pasa a "Entregados hoy".
 * - Pestaña "Visitas": las de hoy, primero las que siguen adentro, con
 *   "Marcar salida".
 * - El botón primario es el de registrar lo de la pestaña en que se está.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { useCarga } from "@/shared/ui/use-load";
import { hoyEnLima, textoDeHora } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Button, Card, Dialog, EmptyState, PageHeader, SectionTitle, Select, StatusDot, Tabs, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { AccesosPuerto, UnidadCorta } from "../application/ports";
import {
  debeAvisarse,
  diasEnPorteria,
  entregadosHoy,
  paquetesPendientes,
  validarEntrega,
  validarPaquete,
  validarVisita,
  visitasDeHoy,
  type ErroresDePaquete,
  type ErroresDeVisita,
  type Paquete,
  type Visita,
} from "../domain/access";

type Pestana = "paquetes" | "visitas";

interface Datos {
  paquetes: Paquete[];
  visitas: Visita[];
}

function textoDeLlegada(p: Paquete, hoy: string): string {
  const n = diasEnPorteria(p, hoy);
  if (n === 0) return `Llegó hoy ${textoDeHora(p.recibidoEn)}`;
  if (n === 1) return `Llegó ayer ${textoDeHora(p.recibidoEn)}`;
  return `Lleva ${n} días en portería`;
}

export function PantallaAccesos({ accesos, edificioId }: { accesos: AccesosPuerto; edificioId: string }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const [pestana, setPestana] = useState<Pestana>("paquetes");
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const [entregando, setEntregando] = useState<Paquete | null>(null);
  const [registrando, setRegistrando] = useState<Pestana | null>(null);
  const leer = useCallback(async (): Promise<Datos> => {
    const [paquetes, visitas] = await Promise.all([accesos.paquetes(edificioId), accesos.visitas(edificioId)]);
    return { paquetes, visitas };
  }, [accesos, edificioId]);
  const { carga, reintentar } = useCarga(leer);
  const hoy = hoyEnLima();

  const datos = carga.estado === "listo" ? carga.valor : null;
  const pendientes = datos ? paquetesPendientes(datos.paquetes) : [];
  const entregados = datos ? entregadosHoy(datos.paquetes, hoy) : [];
  const deHoy = datos ? visitasDeHoy(datos.visitas, hoy) : [];

  async function salida(v: Visita) {
    const r = await accesos.marcarSalida(v.id);
    setAviso(r.ok ? { tono: "ok", texto: `Salida de ${v.visitante} (unidad ${v.unidadNumero}) a las ${textoDeHora(r.valor.salida ?? "")}.` } : { tono: "error", texto: r.mensaje });
    reintentar();
  }

  function hecho(texto: string) {
    setEntregando(null);
    setRegistrando(null);
    setAviso({ tono: "ok", texto });
    reintentar();
  }

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title="Accesos y paquetes"
        actions={
          <Button
            icon="plus"
            label={pestana === "paquetes" ? "Registrar paquete" : "Registrar visita"}
            onPress={() => setRegistrando(pestana)}
            testID="accesos-registrar"
          />
        }
      />
      <Tabs
        accessibilityLabel="Portería"
        items={[
          { key: "paquetes", label: "Paquetes", count: datos ? pendientes.length : undefined },
          { key: "visitas", label: "Visitas de hoy", count: datos ? deHoy.length : undefined },
        ]}
        value={pestana}
        onChange={(p) => {
          setAviso(null);
          setPestana(p);
        }}
      />
      <LineaDeAviso aviso={aviso} />
      {carga.estado === "cargando" ? <Cargando /> : null}
      {carga.estado === "error" ? (
        <EmptyState
          title="No se pudo leer la portería"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}

      {datos && pestana === "paquetes" ? (
        // En pantalla ancha, lo que espera en portería y lo entregado hoy van lado a lado.
        <View style={s.columnas}>
          {pendientes.length === 0 ? (
            <View style={s.principal}>
              <EmptyState icon="inbox" title="No hay paquetes en portería" />
            </View>
          ) : (
            <Card padding="md" style={[s.tabla, s.principal]}>
              {pendientes.map((p, i) => (
                <View key={p.id} style={[s.fila, i === 0 && s.primera]}>
                  <Text style={[textStyle(t, "title"), s.unidad]} accessibilityLabel={`Unidad ${p.unidadNumero}`}>
                    {p.unidadNumero}
                  </Text>
                  <View style={s.detalle}>
                    <Text style={[textStyle(t, "body"), s.fuerte]}>{p.descripcion ? `${p.descripcion} · ${p.remitente}` : p.remitente}</Text>
                    {debeAvisarse(p, hoy) ? (
                      <StatusDot tone="warning" label={`! ${textoDeLlegada(p, hoy)}`} />
                    ) : (
                      <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{textoDeLlegada(p, hoy)}</Text>
                    )}
                  </View>
                  <Button
                    size="sm"
                    variant="secondary"
                    label="Entregar…"
                    accessibilityLabel={`Entregar el paquete de la unidad ${p.unidadNumero}`}
                    onPress={() => setEntregando(p)}
                    style={s.accion}
                  />
                </View>
              ))}
            </Card>
          )}
          {entregados.length > 0 ? (
            <View style={[s.seccion, s.secundaria]}>
              <SectionTitle>Entregados hoy</SectionTitle>
              <Card padding="md" style={s.tabla}>
                {entregados.map((p, i) => (
                  <View key={p.id} style={[s.fila, i === 0 && s.primera]}>
                    <Text style={[textStyle(t, "subtitle", t.color.text.secondary), s.unidad]}>{p.unidadNumero}</Text>
                    <View style={s.detalle}>
                      <Text style={textStyle(t, "body")}>{p.descripcion ? `${p.descripcion} · ${p.remitente}` : p.remitente}</Text>
                      <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`✓ Entregado a ${p.entregadoA} a las ${textoDeHora(p.entregadoEn ?? "")}`}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </View>
      ) : null}

      {datos && pestana === "visitas" ? (
        deHoy.length === 0 ? (
          <EmptyState icon="users" title="No hay visitas hoy" />
        ) : (
          <Card padding="md" style={s.tabla}>
            {deHoy.map((v, i) => (
              <View key={v.id} style={[s.fila, i === 0 && s.primera]}>
                <View style={s.hora}>
                  <Text style={[textStyle(t, "data"), s.fuerte]}>{textoDeHora(v.entrada)}</Text>
                  <Text style={textStyle(t, "caption", t.color.text.secondary)}>entrada</Text>
                </View>
                <View style={s.detalle}>
                  <Text style={[textStyle(t, "body"), s.fuerte]}>{v.visitante}</Text>
                  <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>
                    {[`Unidad ${v.unidadNumero}`, v.documento].filter(Boolean).join(" · ")}
                  </Text>
                  {v.salida ? (
                    <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>{`Salió ${textoDeHora(v.salida)}`}</Text>
                  ) : (
                    <StatusDot tone="info" label="Adentro" />
                  )}
                </View>
                {v.salida ? null : (
                  <Button
                    size="sm"
                    variant="secondary"
                    label="Marcar salida"
                    accessibilityLabel={`Marcar la salida de ${v.visitante}`}
                    onPress={() => salida(v)}
                    style={s.accion}
                  />
                )}
              </View>
            ))}
          </Card>
        )
      ) : null}

      {entregando ? (
        <Entrega
          accesos={accesos}
          paquete={entregando}
          onCerrar={() => setEntregando(null)}
          onHecho={(p) => hecho(`Paquete de la unidad ${p.unidadNumero} entregado a ${p.entregadoA}.`)}
        />
      ) : null}
      {registrando === "paquetes" ? (
        <NuevoPaquete
          accesos={accesos}
          edificioId={edificioId}
          onCerrar={() => setRegistrando(null)}
          onHecho={(p) => hecho(`Paquete registrado para la unidad ${p.unidadNumero}.`)}
        />
      ) : null}
      {registrando === "visitas" ? (
        <NuevaVisita
          accesos={accesos}
          edificioId={edificioId}
          onCerrar={() => setRegistrando(null)}
          onHecho={(v) => hecho(`${v.visitante} entró a la unidad ${v.unidadNumero}.`)}
        />
      ) : null}
    </ScrollView>
  );
}

function Entrega({ accesos, paquete, onCerrar, onHecho }: { accesos: AccesosPuerto; paquete: Paquete; onCerrar: () => void; onHecho: (p: Paquete) => void }) {
  const [recibe, setRecibe] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entregar() {
    if (enviando) return;
    const e = validarEntrega(recibe);
    setError(e);
    if (e) return;
    setEnviando(true);
    const r = await accesos.entregarPaquete(paquete.id, recibe.trim());
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title={`Entregar el paquete de la unidad ${paquete.unidadNumero}`}
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Marcar entregado" onPress={entregar} loading={enviando} testID="accesos-entregar" />
        </>
      }
    >
      <TextField
        label="Quién lo recoge"
        required
        autoFocus
        value={recibe}
        onChangeText={(v) => {
          setRecibe(v);
          setError(undefined);
        }}
        onSubmitEditing={entregar}
        placeholder="Nombre de quien se lo lleva"
        error={error}
      />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

function useUnidades(accesos: AccesosPuerto, edificioId: string) {
  const leer = useCallback(() => accesos.unidades(edificioId), [accesos, edificioId]);
  const { carga } = useCarga<UnidadCorta[]>(leer);
  return carga.estado === "listo" ? carga.valor.map((u) => ({ id: u.id, label: `Unidad ${u.numero}` })) : [];
}

function NuevoPaquete({
  accesos,
  edificioId,
  onCerrar,
  onHecho,
}: {
  accesos: AccesosPuerto;
  edificioId: string;
  onCerrar: () => void;
  onHecho: (p: Paquete) => void;
}) {
  const opciones = useUnidades(accesos, edificioId);
  const [unidadId, setUnidadId] = useState<string | undefined>(undefined);
  const [remitente, setRemitente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errores, setErrores] = useState<ErroresDePaquete>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function registrar() {
    if (enviando) return;
    const e = validarPaquete({ unidadId, remitente });
    setErrores(e);
    if (Object.keys(e).length > 0 || !unidadId) return;
    setEnviando(true);
    const r = await accesos.recibirPaquete({ edificioId, unidadId, remitente: remitente.trim(), descripcion: descripcion.trim() || null });
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Registrar paquete"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Registrar" onPress={registrar} loading={enviando} testID="accesos-guardar-paquete" />
        </>
      }
    >
      <Select
        label="Unidad"
        placeholder="Elige la unidad"
        accessibilityLabel="Unidad del paquete"
        options={opciones}
        value={unidadId}
        onChange={(id) => {
          setUnidadId(id);
          setErrores((x) => ({ ...x, unidadId: undefined }));
        }}
        error={errores.unidadId}
      />
      <TextField
        label="Quién lo trae"
        required
        value={remitente}
        onChangeText={(v) => {
          setRemitente(v);
          setErrores((x) => ({ ...x, remitente: undefined }));
        }}
        placeholder="Ej.: empresa de reparto"
        error={errores.remitente}
      />
      <TextField label="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Ej.: caja mediana" />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

function NuevaVisita({
  accesos,
  edificioId,
  onCerrar,
  onHecho,
}: {
  accesos: AccesosPuerto;
  edificioId: string;
  onCerrar: () => void;
  onHecho: (v: Visita) => void;
}) {
  const opciones = useUnidades(accesos, edificioId);
  const [unidadId, setUnidadId] = useState<string | undefined>(undefined);
  const [visitante, setVisitante] = useState("");
  const [documento, setDocumento] = useState("");
  const [errores, setErrores] = useState<ErroresDeVisita>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function registrar() {
    if (enviando) return;
    const e = validarVisita({ unidadId, visitante });
    setErrores(e);
    if (Object.keys(e).length > 0 || !unidadId) return;
    setEnviando(true);
    const r = await accesos.registrarVisita({ edificioId, unidadId, visitante: visitante.trim(), documento: documento.trim() || null });
    setEnviando(false);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title="Registrar visita"
      onClose={onCerrar}
      footer={
        <>
          <Button variant="secondary" label="Cancelar" onPress={onCerrar} disabled={enviando} />
          <Button label="Registrar entrada" onPress={registrar} loading={enviando} testID="accesos-guardar-visita" />
        </>
      }
    >
      <Select
        label="Unidad que visita"
        placeholder="Elige la unidad"
        accessibilityLabel="Unidad que visita"
        options={opciones}
        value={unidadId}
        onChange={(id) => {
          setUnidadId(id);
          setErrores((x) => ({ ...x, unidadId: undefined }));
        }}
        error={errores.unidadId}
      />
      <TextField
        label="Nombre"
        required
        value={visitante}
        onChangeText={(v) => {
          setVisitante(v);
          setErrores((x) => ({ ...x, visitante: undefined }));
        }}
        error={errores.visitante}
      />
      <TextField label="Documento" value={documento} onChangeText={setDocumento} placeholder="Ej.: DNI 12345678" />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    seccion: { gap: t.space.sm },
    columnas: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: t.space.lg },
    principal: { flexGrow: 2, flexShrink: 1, flexBasis: 520, minWidth: 0 },
    secundaria: { flexGrow: 1, flexShrink: 1, flexBasis: 340, minWidth: 0 },
    tabla: { paddingVertical: t.space.xs },
    fila: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: t.space.md,
      rowGap: t.space.xs,
      paddingVertical: t.space.md,
      borderTopWidth: 1,
      borderTopColor: t.color.border.subtle,
    },
    primera: { borderTopWidth: 0 },
    unidad: { width: 64, fontVariant: ["tabular-nums"] },
    hora: { width: 64 },
    detalle: { flexGrow: 1, flexShrink: 1, flexBasis: 180, gap: t.space.xxs },
    fuerte: { fontWeight: "600" },
    accion: { marginLeft: "auto" },
  });
