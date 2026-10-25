/**
 * Los reportes: tablas de lectura que se arman con lo que ya escribieron
 * otros contextos (recibos de `cobranza`, pagos de `pagos`). Este módulo no
 * escribe nada; con base, cada reporte sería una vista o una función de
 * Postgres, y esto es la misma cuenta para la maqueta y las pruebas.
 *
 * - Con toda la cartera, una fila por edificio; con un edificio elegido, una
 *   fila por unidad (o por pago).
 * - Montos en céntimos enteros. Un recibo cuenta como pagado si lo aceptado
 *   de su unidad en el periodo cubre su total.
 * - Supuesto: "deuda vencida" es lo de recibos con vencimiento pasado que no
 *   cubren los pagos aceptados, más lo arrastrado de meses anteriores.
 */

export type ReporteId = "recaudacion" | "morosidad" | "por-validar";

export interface ReporteDisponible {
  id: ReporteId;
  nombre: string;
  /** Lo que responde, en una línea. */
  pregunta: string;
}

export const REPORTES: readonly ReporteDisponible[] = [
  { id: "recaudacion", nombre: "Recaudación del mes", pregunta: "Cuánto se emitió y cuánto se cobró" },
  { id: "morosidad", nombre: "Morosidad", pregunta: "Quién tiene deuda vencida y cuánta" },
  { id: "por-validar", nombre: "Pagos por validar", pregunta: "Cuánto dinero espera validación" },
];

export type TipoDeColumna = "texto" | "soles" | "numero" | "porcentaje" | "fecha";

export interface Columna {
  clave: string;
  titulo: string;
  tipo: TipoDeColumna;
}

export type Celda = string | number | null;

export interface TablaDeReporte {
  columnas: Columna[];
  filas: Record<string, Celda>[];
  /** La fila de totales, si el reporte la tiene. */
  total: Record<string, Celda> | null;
}

export interface EdificioR {
  id: string;
  nombre: string;
}

export interface UnidadR {
  id: string;
  edificioId: string;
  numero: string;
  /** Lo vencido que arrastra de meses anteriores, en céntimos. */
  deudaAnterior: number;
}

export interface ReciboR {
  edificioId: string;
  unidadId: string;
  periodo: string;
  total: number;
  vence: string;
}

export interface PagoR {
  edificioId: string;
  unidadId: string;
  monto: number;
  fecha: string;
  estado: "por_validar" | "aceptado" | "rechazado";
}

export interface Datos {
  edificios: EdificioR[];
  unidades: UnidadR[];
  recibos: ReciboR[];
  pagos: PagoR[];
}

function sumar(n: number[]): number {
  return n.reduce((a, b) => a + b, 0);
}

function aceptadoDe(pagos: readonly PagoR[], unidadId: string, periodo: string): number {
  return sumar(pagos.filter((p) => p.unidadId === unidadId && p.estado === "aceptado" && p.fecha.startsWith(periodo.slice(0, 7))).map((p) => p.monto));
}

/** Lo vencido de una unidad a hoy. */
export function deudaVencida(d: Datos, unidad: UnidadR, hoy: string): number {
  const vencido = sumar(d.recibos.filter((r) => r.unidadId === unidad.id && r.vence < hoy).map((r) => r.total));
  const pagado = sumar(d.pagos.filter((p) => p.unidadId === unidad.id && p.estado === "aceptado").map((p) => p.monto));
  return unidad.deudaAnterior + Math.max(0, vencido - pagado);
}

function porcentaje(parte: number, todo: number): number | null {
  return todo === 0 ? null : parte / todo;
}

export function recaudacion(d: Datos, periodo: string, edificioId: string | null): TablaDeReporte {
  const recibos = d.recibos.filter((r) => r.periodo.slice(0, 7) === periodo.slice(0, 7));
  if (edificioId) {
    const filas = recibos
      .filter((r) => r.edificioId === edificioId)
      .map((r) => {
        const cobrado = aceptadoDe(d.pagos, r.unidadId, periodo);
        return { unidad: d.unidades.find((u) => u.id === r.unidadId)?.numero ?? "—", emitido: r.total, cobrado, saldo: Math.max(0, r.total - cobrado) };
      })
      .sort((a, b) => String(a.unidad).localeCompare(String(b.unidad), "es", { numeric: true }));
    return {
      columnas: [
        { clave: "unidad", titulo: "Unidad", tipo: "texto" },
        { clave: "emitido", titulo: "Emitido", tipo: "soles" },
        { clave: "cobrado", titulo: "Cobrado", tipo: "soles" },
        { clave: "saldo", titulo: "Por cobrar", tipo: "soles" },
      ],
      filas,
      total: filas.length
        ? { unidad: "Total", emitido: sumar(filas.map((f) => f.emitido)), cobrado: sumar(filas.map((f) => f.cobrado)), saldo: sumar(filas.map((f) => f.saldo)) }
        : null,
    };
  }
  const filas = d.edificios.map((e) => {
    const propios = recibos.filter((r) => r.edificioId === e.id);
    const emitido = sumar(propios.map((r) => r.total));
    const cobrado = sumar(propios.map((r) => Math.min(r.total, aceptadoDe(d.pagos, r.unidadId, periodo))));
    const pagados = propios.filter((r) => aceptadoDe(d.pagos, r.unidadId, periodo) >= r.total).length;
    return { edificio: e.nombre, recibos: propios.length, pagados, emitido, cobrado, avance: propios.length ? porcentaje(cobrado, emitido) : null };
  });
  const emitido = sumar(filas.map((f) => f.emitido));
  const cobrado = sumar(filas.map((f) => f.cobrado));
  return {
    columnas: [
      { clave: "edificio", titulo: "Edificio", tipo: "texto" },
      { clave: "recibos", titulo: "Recibos", tipo: "numero" },
      { clave: "pagados", titulo: "Pagados", tipo: "numero" },
      { clave: "emitido", titulo: "Emitido", tipo: "soles" },
      { clave: "cobrado", titulo: "Cobrado", tipo: "soles" },
      { clave: "avance", titulo: "Avance", tipo: "porcentaje" },
    ],
    filas,
    total: {
      edificio: "Total",
      recibos: sumar(filas.map((f) => f.recibos)),
      pagados: sumar(filas.map((f) => f.pagados)),
      emitido,
      cobrado,
      avance: porcentaje(cobrado, emitido),
    },
  };
}

export function morosidad(d: Datos, hoy: string, edificioId: string | null): TablaDeReporte {
  if (edificioId) {
    const filas = d.unidades
      .filter((u) => u.edificioId === edificioId)
      .map((u) => ({ unidad: u.numero, deuda: deudaVencida(d, u, hoy) }))
      .filter((f) => f.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda);
    return {
      columnas: [
        { clave: "unidad", titulo: "Unidad", tipo: "texto" },
        { clave: "deuda", titulo: "Deuda vencida", tipo: "soles" },
      ],
      filas,
      total: filas.length ? { unidad: "Total", deuda: sumar(filas.map((f) => f.deuda)) } : null,
    };
  }
  const filas = d.edificios.map((e) => {
    const unidades = d.unidades.filter((u) => u.edificioId === e.id);
    const deudas = unidades.map((u) => deudaVencida(d, u, hoy));
    const conDeuda = deudas.filter((x) => x > 0).length;
    return { edificio: e.nombre, unidades: unidades.length, conDeuda, proporcion: porcentaje(conDeuda, unidades.length), deuda: sumar(deudas) };
  });
  const unidades = sumar(filas.map((f) => f.unidades));
  const conDeuda = sumar(filas.map((f) => f.conDeuda));
  return {
    columnas: [
      { clave: "edificio", titulo: "Edificio", tipo: "texto" },
      { clave: "unidades", titulo: "Unidades", tipo: "numero" },
      { clave: "conDeuda", titulo: "Con deuda", tipo: "numero" },
      { clave: "proporcion", titulo: "Morosidad", tipo: "porcentaje" },
      { clave: "deuda", titulo: "Deuda vencida", tipo: "soles" },
    ],
    filas,
    total: { edificio: "Total", unidades, conDeuda, proporcion: porcentaje(conDeuda, unidades), deuda: sumar(filas.map((f) => f.deuda)) },
  };
}

export function porValidar(d: Datos, edificioId: string | null): TablaDeReporte {
  const pendientes = d.pagos.filter((p) => p.estado === "por_validar");
  if (edificioId) {
    const filas = pendientes
      .filter((p) => p.edificioId === edificioId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((p) => ({ unidad: d.unidades.find((u) => u.id === p.unidadId)?.numero ?? "—", fecha: p.fecha, monto: p.monto }));
    return {
      columnas: [
        { clave: "unidad", titulo: "Unidad", tipo: "texto" },
        { clave: "fecha", titulo: "Pagó el", tipo: "fecha" },
        { clave: "monto", titulo: "Monto", tipo: "soles" },
      ],
      filas,
      total: filas.length ? { unidad: "Total", fecha: null, monto: sumar(filas.map((f) => f.monto)) } : null,
    };
  }
  const filas = d.edificios.map((e) => {
    const propios = pendientes.filter((p) => p.edificioId === e.id);
    const masAntiguo = propios.map((p) => p.fecha).sort()[0] ?? null;
    return { edificio: e.nombre, pagos: propios.length, monto: sumar(propios.map((p) => p.monto)), desde: masAntiguo };
  });
  return {
    columnas: [
      { clave: "edificio", titulo: "Edificio", tipo: "texto" },
      { clave: "pagos", titulo: "Pagos", tipo: "numero" },
      { clave: "monto", titulo: "Monto", tipo: "soles" },
      { clave: "desde", titulo: "El más antiguo", tipo: "fecha" },
    ],
    filas,
    total: { edificio: "Total", pagos: sumar(filas.map((f) => f.pagos)), monto: sumar(filas.map((f) => f.monto)), desde: null },
  };
}

export function generar(id: ReporteId, d: Datos, ctx: { hoy: string; edificioId: string | null }): TablaDeReporte {
  switch (id) {
    case "recaudacion":
      return recaudacion(d, ctx.hoy.slice(0, 7), ctx.edificioId);
    case "morosidad":
      return morosidad(d, ctx.hoy, ctx.edificioId);
    case "por-validar":
      return porValidar(d, ctx.edificioId);
  }
}

/**
 * La tabla como CSV, para abrirla en una hoja de cálculo: los títulos de las
 * columnas, una línea por fila y la de totales al final. Los montos van en
 * soles con punto decimal y sin el "S/", para que la hoja los lea como
 * números; las fechas, en ISO. Supuesto: coma como separador (falta saber
 * con qué hoja de cálculo trabaja el cliente).
 */
export function csvDelReporte(tabla: TablaDeReporte): string {
  const celda = (c: Celda, col: Columna): string => {
    if (c === null || c === undefined) return "";
    if (col.tipo === "soles") return (Number(c) / 100).toFixed(2);
    if (col.tipo === "porcentaje") return String(Math.round(Number(c) * 100) / 100);
    return String(c);
  };
  const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const linea = (valores: string[]) => valores.map(escapar).join(",");
  const filas = tabla.total ? [...tabla.filas, tabla.total] : tabla.filas;
  return [linea(tabla.columnas.map((c) => c.titulo)), ...filas.map((f) => linea(tabla.columnas.map((c) => celda(f[c.clave], c))))].join("\n");
}
