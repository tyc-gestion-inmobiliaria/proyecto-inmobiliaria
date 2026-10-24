/**
 * Paso 2: el presupuesto del mes (PB-15).
 *
 * - Partidas con concepto y monto; el total y la cuota de cada unidad se ven
 *   mientras se escribe (la cuota definitiva la calcula la base al revisar).
 * - "Copiar del mes anterior" precarga las partidas del último cierre para
 *   ajustarlas.
 * - Si las participaciones no suman 100 %, el aviso dice la diferencia y
 *   lleva al padrón.
 * - El error de cada partida va junto a su campo.
 */
import { router } from "expo-router";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Aviso } from "@/compartido/ui/piezas";
import {
  Button,
  Card,
  DataTable,
  KeyValueRow,
  SectionTitle,
  TableHead,
  TableRow,
  Td,
  TextField,
  Th,
  textStyle,
  useStyles,
  useTheme,
  type Tema,
} from "@/ui";

import { guardarPresupuesto } from "../aplicacion/casos-de-uso";
import type { CobranzaPuerto } from "../aplicacion/puertos";
import type { Cierre } from "../dominio/cierre";
import { leerMonto, textoDeSoles } from "../dominio/dinero";
import { filasDePartidas, totalDeFilas, type ErroresDePartida, type FilaDePartida, type Partida } from "../dominio/presupuesto";
import { repartir } from "../dominio/prorrateo";
import type { FilaPrevia } from "../dominio/recibo";
import type { Validacion } from "../dominio/validaciones";
import type { PasoAbierto } from "./paso";

const PORCENTAJE = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

export const PasoPresupuesto = forwardRef<
  PasoAbierto,
  {
    cobranza: CobranzaPuerto;
    orgId: string;
    cierre: Cierre;
    partidas: Partida[];
    unidades: Pick<FilaPrevia, "unidadId" | "unidadNumero" | "participacion">[];
    participacion: Validacion;
    editable: boolean;
    onGuardado: () => void;
  }
>(function PasoPresupuesto({ cobranza, orgId, cierre, partidas, unidades, participacion, editable, onGuardado }, ref) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const siguiente = useRef(0);
  const nuevaClave = () => `p${(siguiente.current += 1)}`;
  const [filas, setFilas] = useState<FilaDePartida[]>(() =>
    partidas.length > 0 ? filasDePartidas(partidas, nuevaClave) : [{ clave: nuevaClave(), concepto: "", monto: "" }],
  );
  const [errores, setErrores] = useState<Record<string, ErroresDePartida>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);
  const [sinAnterior, setSinAnterior] = useState(false);

  useImperativeHandle(ref, () => ({
    async guardar() {
      setGeneral(null);
      const r = await guardarPresupuesto(cobranza, orgId, cierre.id, filas);
      if (r.ok) {
        setErrores({});
        onGuardado();
        return true;
      }
      if (r.errores) setErrores(r.errores);
      else setGeneral(r.general);
      return false;
    },
  }));

  function cambiar(clave: string, campo: "concepto" | "monto", valor: string) {
    setFilas((f) => f.map((x) => (x.clave === clave ? { ...x, [campo]: valor } : x)));
    if (errores[clave]?.[campo]) setErrores((e) => ({ ...e, [clave]: { ...e[clave], [campo]: undefined } }));
  }

  async function copiar() {
    setCopiando(true);
    try {
      const anteriores = await cobranza.partidasDelPeriodoAnterior(orgId, cierre.edificioId, cierre.periodo);
      if (anteriores.length === 0) setSinAnterior(true);
      else setFilas(filasDePartidas(anteriores, nuevaClave));
    } catch {
      setGeneral("No se pudo leer el mes anterior. Revisa tu conexión.");
    }
    setCopiando(false);
  }

  const total = totalDeFilas(filas);
  const cuotas = repartir(
    total,
    unidades.map((u) => ({ clave: u.unidadId, peso: u.participacion })),
  );
  const vacio = filas.every((f) => f.concepto.trim() === "" && f.monto.trim() === "");

  return (
    <View style={s.paso}>
      {participacion.estado === "falla" ? (
        <View style={s.aviso}>
          <Aviso>{participacion.causa}</Aviso>
          <View style={s.botones}>
            <Button
              variant="secondary"
              size="sm"
              label="Corregir en el padrón"
              onPress={() => router.push({ pathname: "/edificios/[id]/unidades", params: { id: cierre.edificioId } })}
            />
          </View>
        </View>
      ) : null}

      <Card padding="lg" style={s.tarjeta}>
        <View style={s.cabecera}>
          <SectionTitle>Partidas del mes</SectionTitle>
          {editable && vacio ? (
            <Button variant="secondary" size="sm" label="Copiar del mes anterior" loading={copiando} onPress={copiar} />
          ) : null}
        </View>
        {sinAnterior ? (
          <Text style={textStyle(t, "bodySmall", t.color.text.secondary)}>No hay un mes anterior con presupuesto en este edificio.</Text>
        ) : null}
        {filas.map((f, i) =>
          editable ? (
            <View key={f.clave} style={s.partida}>
              <TextField
                label={i === 0 ? "Concepto" : undefined}
                accessibilityLabel={`Concepto de la partida ${i + 1}`}
                value={f.concepto}
                onChangeText={(v) => cambiar(f.clave, "concepto", v)}
                placeholder="Ej.: Limpieza de áreas comunes"
                error={errores[f.clave]?.concepto}
                style={s.concepto}
              />
              <TextField
                label={i === 0 ? "Monto (S/)" : undefined}
                accessibilityLabel={`Monto de la partida ${i + 1}`}
                value={f.monto}
                onChangeText={(v) => cambiar(f.clave, "monto", v)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                mono
                error={errores[f.clave]?.monto}
                style={s.monto}
              />
              <View style={i === 0 ? s.quitarConEtiqueta : s.quitar}>
                <Button
                  variant="ghost"
                  size="sm"
                  label="Quitar"
                  accessibilityLabel={`Quitar la partida ${f.concepto || i + 1}`}
                  disabled={filas.length === 1}
                  onPress={() => setFilas((x) => x.filter((y) => y.clave !== f.clave))}
                />
              </View>
            </View>
          ) : (
            <KeyValueRow key={f.clave} label={f.concepto} value={textoDeSoles(leerMonto(f.monto) ?? 0)} />
          ),
        )}
        {editable ? (
          <View style={s.botones}>
            <Button variant="ghost" label="+ Agregar partida" onPress={() => setFilas((x) => [...x, { clave: nuevaClave(), concepto: "", monto: "" }])} />
          </View>
        ) : null}
        <KeyValueRow label="Total del presupuesto" value={textoDeSoles(total)} strong />
        {general ? (
          <Text accessibilityRole="alert" style={textStyle(t, "body", t.color.danger.fg)}>
            {`! ${general}`}
          </Text>
        ) : null}
      </Card>

      <SectionTitle>Cuota por unidad</SectionTitle>
      <DataTable minWidth={0}>
        <TableHead>
          <Th flex={1}>Unidad</Th>
          <Th flex={1} align="right">
            Participación
          </Th>
          <Th flex={1} align="right">
            Cuota
          </Th>
        </TableHead>
        {unidades.map((u) => (
          <TableRow key={u.unidadId}>
            <Td flex={1}>{u.unidadNumero}</Td>
            <Td flex={1} align="right" mono muted>
              {`${PORCENTAJE.format(u.participacion)} %`}
            </Td>
            <Td flex={1} align="right" mono>
              {textoDeSoles(cuotas.get(u.unidadId) ?? 0)}
            </Td>
          </TableRow>
        ))}
      </DataTable>
    </View>
  );
});

const makeStyles = (t: Tema) =>
  StyleSheet.create({
    paso: { gap: t.space.lg },
    aviso: { gap: t.space.sm },
    tarjeta: { gap: t.space.md },
    cabecera: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.space.sm },
    partida: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: t.space.sm },
    concepto: { flexGrow: 3, flexBasis: 220 },
    monto: { flexGrow: 1, flexBasis: 120, maxWidth: 180 },
    quitar: { paddingTop: t.space.xs },
    // Con la etiqueta encima del campo, el botón baja hasta la altura del campo.
    quitarConEtiqueta: { paddingTop: t.space.xl - 2 },
    botones: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
  });
