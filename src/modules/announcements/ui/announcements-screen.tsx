/**
 * Los comunicados de un edificio a sus residentes.
 *
 * - Dos pestañas: publicados y borradores, cada una con cuántos hay.
 * - Cada comunicado se toca entero: un borrador se abre para seguir
 *   escribiéndolo; uno publicado, para leerlo completo (no se edita).
 * - "Redactar" es el único primario de la vista. En el editor, "Publicar"
 *   es el primario y "Guardar borrador" el secundario; el borrador solo pide
 *   el título, publicar pide todo, con el error junto a su campo.
 */
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LineaDeAviso, type AvisoDeAccion } from "@/shared/ui/action-notice";
import { CampoDeOpciones, FlechaDeFila } from "@/shared/ui/pieces";
import { useCarga } from "@/shared/ui/use-load";
import { textoDeFecha } from "@/shared/format";
import { Cargando } from "@/modules/organizations/ui/with-organization";
import { ANCHO_DE_PANTALLA } from "@/shared/ui/layout";
import { Badge, Button, Card, Dialog, EmptyState, PageHeader, Tabs, TextField, textStyle, useStyles, useTheme, type Tema } from "@/ui";

import type { ComunicadosPuerto } from "../application/ports";
import {
  CUERPO_MAXIMO,
  extracto,
  ordenarComunicados,
  TEXTO_DE_AUDIENCIA,
  validarComunicado,
  type Audiencia,
  type Comunicado,
  type DatosDelComunicado,
  type ErroresDelComunicado,
  type EstadoDelComunicado,
} from "../domain/announcement";

const AUDIENCIAS: Audiencia[] = ["todos", "propietarios"];

/** Lo que está abierto: el editor (nuevo o un borrador) o la lectura de uno publicado. */
type Abierto = { modo: "editar"; comunicado: Comunicado | null } | { modo: "leer"; comunicado: Comunicado };

export function PantallaComunicados({ comunicados, edificioId }: { comunicados: ComunicadosPuerto; edificioId: string }) {
  const s = useStyles(makeStyles);
  const [pestana, setPestana] = useState<EstadoDelComunicado>("publicado");
  const [aviso, setAviso] = useState<AvisoDeAccion | null>(null);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const leer = useCallback(() => comunicados.delEdificio(edificioId), [comunicados, edificioId]);
  const { carga, reintentar } = useCarga(leer);

  const todos = carga.estado === "listo" ? carga.valor : [];
  const cuenta = (e: EstadoDelComunicado) => (carga.estado === "listo" ? todos.filter((c) => c.estado === e).length : undefined);
  const visibles = ordenarComunicados(todos.filter((c) => c.estado === pestana));

  return (
    <ScrollView contentContainerStyle={s.pantalla}>
      <PageHeader
        title="Comunicados"
        actions={<Button icon="pencil" label="Redactar" onPress={() => setAbierto({ modo: "editar", comunicado: null })} testID="comunicados-redactar" />}
      />
      <Tabs
        accessibilityLabel="Comunicados"
        items={[
          { key: "publicado", label: "Publicados", count: cuenta("publicado") },
          { key: "borrador", label: "Borradores", count: cuenta("borrador") },
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
          title="No se pudieron leer los comunicados"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={<Button label="Reintentar" onPress={reintentar} />}
        />
      ) : null}
      {carga.estado === "listo" && visibles.length === 0 ? (
        <EmptyState icon="send" title={pestana === "publicado" ? "Todavía no hay comunicados publicados" : "No hay borradores"} />
      ) : null}
      <View style={s.lista}>
        {visibles.map((c) => (
          <TarjetaDeComunicado
            key={c.id}
            comunicado={c}
            onPress={() => setAbierto(c.estado === "borrador" ? { modo: "editar", comunicado: c } : { modo: "leer", comunicado: c })}
          />
        ))}
      </View>
      {abierto?.modo === "leer" ? <Lectura comunicado={abierto.comunicado} onCerrar={() => setAbierto(null)} /> : null}
      {abierto?.modo === "editar" ? (
        <Editor
          comunicados={comunicados}
          edificioId={edificioId}
          borrador={abierto.comunicado}
          onCerrar={() => setAbierto(null)}
          onHecho={(c) => {
            setAbierto(null);
            setPestana(c.estado);
            setAviso({ tono: "ok", texto: c.estado === "publicado" ? `Publicado "${c.titulo}".` : `Borrador guardado: "${c.titulo}".` });
            reintentar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function TarjetaDeComunicado({ comunicado: c, onPress }: { comunicado: Comunicado; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const cuando = c.publicadoEl ? `Publicado el ${textoDeFecha(c.publicadoEl)}` : `Editado el ${textoDeFecha(c.editadoEl)}`;
  return (
    <Card
      padding="lg"
      style={s.tarjeta}
      onPress={onPress}
      accessibilityLabel={`${c.estado === "borrador" ? "Borrador" : "Comunicado"}: ${c.titulo}. ${cuando}. ${c.estado === "borrador" ? "Abrir para editar" : "Abrir para leer"}`}
    >
      <View style={s.cabeza}>
        <Text style={[textStyle(t, "subtitle"), s.titulo]} numberOfLines={2}>
          {c.titulo}
        </Text>
        <FlechaDeFila />
      </View>
      {c.cuerpo.trim() ? (
        <Text style={textStyle(t, "bodySmall", t.color.text.secondary)} numberOfLines={2}>
          {extracto(c.cuerpo)}
        </Text>
      ) : null}
      <View style={s.meta}>
        {c.estado === "borrador" ? <Badge tone="warning" label="Borrador" /> : null}
        <Text style={textStyle(t, "caption", t.color.text.secondary)}>{`${cuando} · ${TEXTO_DE_AUDIENCIA[c.audiencia]}`}</Text>
      </View>
    </Card>
  );
}

function Lectura({ comunicado: c, onCerrar }: { comunicado: Comunicado; onCerrar: () => void }) {
  const t = useTheme();
  return (
    <Dialog visible title={c.titulo} onClose={onCerrar} footer={<Button variant="secondary" label="Cerrar" onPress={onCerrar} />}>
      <Text style={textStyle(t, "caption", t.color.text.secondary)}>
        {`Publicado el ${textoDeFecha(c.publicadoEl ?? c.editadoEl)} · ${TEXTO_DE_AUDIENCIA[c.audiencia]}`}
      </Text>
      <Text style={textStyle(t, "body")}>{c.cuerpo}</Text>
    </Dialog>
  );
}

function Editor({
  comunicados,
  edificioId,
  borrador,
  onCerrar,
  onHecho,
}: {
  comunicados: ComunicadosPuerto;
  edificioId: string;
  borrador: Comunicado | null;
  onCerrar: () => void;
  onHecho: (c: Comunicado) => void;
}) {
  const [datos, setDatos] = useState<DatosDelComunicado>({
    titulo: borrador?.titulo ?? "",
    cuerpo: borrador?.cuerpo ?? "",
    audiencia: borrador?.audiencia ?? "todos",
  });
  const [errores, setErrores] = useState<ErroresDelComunicado>({});
  const [general, setGeneral] = useState<AvisoDeAccion | null>(null);
  const [enviando, setEnviando] = useState<"borrador" | "publicar" | null>(null);

  function cambiar<K extends keyof DatosDelComunicado>(campo: K, valor: DatosDelComunicado[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function guardar(para: "borrador" | "publicar") {
    if (enviando) return;
    const e = validarComunicado(datos, para);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setEnviando(para);
    const r = await comunicados.guardar(
      { id: borrador?.id, edificioId, titulo: datos.titulo.trim(), cuerpo: datos.cuerpo.trim(), audiencia: datos.audiencia ?? "todos" },
      para === "publicar",
    );
    setEnviando(null);
    if (r.ok) onHecho(r.valor);
    else setGeneral({ tono: "error", texto: r.mensaje });
  }

  return (
    <Dialog
      visible
      title={borrador ? "Editar borrador" : "Nuevo comunicado"}
      onClose={onCerrar}
      width={640}
      footer={
        <>
          <Button variant="secondary" label="Guardar borrador" onPress={() => guardar("borrador")} loading={enviando === "borrador"} disabled={enviando === "publicar"} />
          <Button icon="send" label="Publicar" onPress={() => guardar("publicar")} loading={enviando === "publicar"} disabled={enviando === "borrador"} testID="comunicados-publicar" />
        </>
      }
    >
      <TextField label="Título" required autoFocus value={datos.titulo} onChangeText={(v) => cambiar("titulo", v)} placeholder="Ej.: corte de agua el sábado" error={errores.titulo} />
      <CampoDeOpciones
        label="Para"
        required
        options={AUDIENCIAS.map((a) => ({ id: a, label: TEXTO_DE_AUDIENCIA[a] }))}
        value={datos.audiencia}
        onChange={(v) => cambiar("audiencia", v)}
        error={errores.audiencia}
      />
      <TextField
        label="Texto"
        required
        multiline
        value={datos.cuerpo}
        onChangeText={(v) => cambiar("cuerpo", v)}
        helper={datos.cuerpo.length > CUERPO_MAXIMO * 0.9 ? `${datos.cuerpo.length} de ${CUERPO_MAXIMO} caracteres` : undefined}
        error={errores.cuerpo}
      />
      <LineaDeAviso aviso={general} />
    </Dialog>
  );
}

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    pantalla: { flexGrow: 1, gap: t.space.lg, padding: t.space.xl, maxWidth: ANCHO_DE_PANTALLA, width: "100%" },
    // Dos comunicados por fila en pantalla ancha: cada uno queda con un ancho cómodo de leer.
    lista: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: t.space.md },
    tarjeta: { flexGrow: 1, flexShrink: 1, flexBasis: 480, minWidth: 0, gap: t.space.sm },
    cabeza: { flexDirection: "row", alignItems: "flex-start", gap: t.space.md },
    titulo: { flex: 1, minWidth: 0 },
    meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space.sm },
  });
