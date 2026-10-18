/**
 * Las cuentas de las gráficas, sin React Native: escalas, marcas del eje,
 * cifras abreviadas, el reparto del mapa de árbol, los arcos de la dona y las
 * cubetas de un histograma. Viven aparte para poder probarlas con Node.
 */

// ── Escalas ───────────────────────────────────────────────────────────────

/**
 * Marcas "redondas" para un eje: 0, 250, 500, 750… y no 0, 237, 474.
 *
 * Devuelve las marcas y el tope real del eje, que es la última marca: así la
 * barra más alta no toca el techo y la rejilla cae en números que se leen.
 * Con negativos, el piso también se redondea.
 */
export function niceTicks(min: number, max: number, count = 4): { ticks: number[]; min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0], min: 0, max: 1 };
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return { ticks: [0, 1], min: 0, max: 1 };
  const crudo = (hi - lo) / count;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const fraccion = crudo / potencia;
  const paso = (fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 2.5 ? 2.5 : fraccion <= 5 ? 5 : 10) * potencia;
  const desde = Math.floor(lo / paso) * paso;
  const hasta = Math.ceil(hi / paso) * paso;
  const ticks: number[] = [];
  for (let v = desde; v <= hasta + paso / 2; v += paso) ticks.push(Math.round(v * 1e6) / 1e6);
  return { ticks, min: desde, max: hasta };
}

/** Una escala lineal: de un valor a píxeles. */
export function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/**
 * `1234567` → `"1.2M"`, `45200` → `"45.2k"`, `980` → `"980"`. Para ejes y
 * etiquetas, donde dos decimales sueltos son ruido. La cifra exacta va en la
 * ayuda emergente y en la tabla.
 */
export function compactNumber(v: number): string {
  const abs = Math.abs(v);
  const signo = v < 0 ? "−" : "";
  const fmt = (n: number, suf: string) => `${signo}${(Math.round(n * 10) / 10).toString()}${suf}`;
  if (abs >= 1e9) return fmt(abs / 1e9, "B");
  if (abs >= 1e6) return fmt(abs / 1e6, "M");
  if (abs >= 1e3) return fmt(abs / 1e3, "k");
  return `${signo}${Math.round(abs * 10) / 10}`;
}

/** Cuántas etiquetas de un eje X se escriben sin que se pisen. */
export function labelStep(count: number, width: number, labelWidth = 44): number {
  if (count <= 0 || width <= 0) return 1;
  const caben = Math.max(1, Math.floor(width / labelWidth));
  return Math.max(1, Math.ceil(count / caben));
}

// ── Color ─────────────────────────────────────────────────────────────────

/**
 * El color de una serie por su **posición fija**, no por su rango actual.
 * Quien aprendió que "Comida es azul" no puede verla volverse naranja porque
 * un filtro sacó a la primera. Pasado el octavo, todo es "Otras".
 */
export function seriesColor(palette: string[], index: number, other: string): string {
  return index >= 0 && index < palette.length ? palette[index] : other;
}

/** El paso de una rampa secuencial que le toca a un valor entre 0 y `max`. */
export function sequentialStep(ramp: string[], value: number, max: number): string | null {
  if (value <= 0 || max <= 0) return null;
  const i = Math.min(ramp.length - 1, Math.floor((value / max) * ramp.length));
  return ramp[Math.max(0, i)];
}

// ── Formas ────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

/** Un trazo SVG que une los puntos con rectas. */
export function linePath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(" ");
}

/** El área entre una línea de arriba y otra de abajo (para apilar). */
export function areaPath(top: Point[], bottom: Point[]): string {
  if (top.length === 0) return "";
  const vuelta = [...bottom].reverse();
  return `${linePath(top)} ${vuelta.map((p) => `L${round(p.x)} ${round(p.y)}`).join(" ")} Z`;
}

/**
 * Un tramo de dona entre dos ángulos (en radianes, 0 arriba, en el sentido
 * del reloj). Se le resta `gap` a cada lado para dejar el hueco de superficie
 * entre porciones, que separa sin dibujar un borde.
 */
export function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number, gap = 0): string {
  const medio = (a1 - a0) / 2;
  const g = Math.min(gap / rOuter, medio * 0.9);
  const s = a0 + g;
  const e = a1 - g;
  const grande = e - s > Math.PI ? 1 : 0;
  const pt = (r: number, a: number) => `${round(cx + r * Math.sin(a))} ${round(cy - r * Math.cos(a))}`;
  // Un tramo de vuelta entera no se puede dibujar con un solo arco.
  if (e - s >= Math.PI * 2 - 1e-6) {
    return `M${pt(rOuter, 0)} A${rOuter} ${rOuter} 0 1 1 ${pt(rOuter, Math.PI)} A${rOuter} ${rOuter} 0 1 1 ${pt(rOuter, 0)} Z M${pt(rInner, 0)} A${rInner} ${rInner} 0 1 0 ${pt(rInner, Math.PI)} A${rInner} ${rInner} 0 1 0 ${pt(rInner, 0)} Z`;
  }
  return [
    `M${pt(rOuter, s)}`,
    `A${rOuter} ${rOuter} 0 ${grande} 1 ${pt(rOuter, e)}`,
    `L${pt(rInner, e)}`,
    `A${rInner} ${rInner} 0 ${grande} 0 ${pt(rInner, s)}`,
    "Z",
  ].join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Mapa de árbol ─────────────────────────────────────────────────────────

export interface TreemapRect<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Reparte un rectángulo entre los valores, cada uno con área proporcional
 * (algoritmo *squarified*: busca que las cajas salgan lo más cuadradas
 * posible, que es lo que deja comparar áreas a ojo).
 */
export function squarify<T>(items: T[], value: (t: T) => number, width: number, height: number): TreemapRect<T>[] {
  const datos = items.filter((t) => value(t) > 0).sort((a, b) => value(b) - value(a));
  const total = datos.reduce((s, t) => s + value(t), 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];
  const escala = (width * height) / total;
  const out: TreemapRect<T>[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let fila: T[] = [];

  const peor = (f: T[], lado: number) => {
    const areas = f.map((t) => value(t) * escala);
    const suma = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    return Math.max((lado * lado * max) / (suma * suma), (suma * suma) / (lado * lado * min));
  };

  const asentar = (f: T[]) => {
    const suma = f.reduce((s, t) => s + value(t) * escala, 0);
    if (w >= h) {
      const ancho = suma / h;
      let yy = y;
      for (const t of f) {
        const alto = (value(t) * escala) / ancho;
        out.push({ item: t, x, y: yy, w: ancho, h: alto });
        yy += alto;
      }
      x += ancho;
      w -= ancho;
    } else {
      const alto = suma / w;
      let xx = x;
      for (const t of f) {
        const ancho = (value(t) * escala) / alto;
        out.push({ item: t, x: xx, y, w: ancho, h: alto });
        xx += ancho;
      }
      y += alto;
      h -= alto;
    }
  };

  for (const t of datos) {
    const lado = Math.min(w, h);
    if (fila.length === 0 || peor([...fila, t], lado) <= peor(fila, lado)) {
      fila.push(t);
    } else {
      asentar(fila);
      fila = [t];
    }
  }
  if (fila.length) asentar(fila);
  return out;
}

// ── Distribución ──────────────────────────────────────────────────────────

export interface Bin {
  /** Desde (excluido, salvo el cero en la primera). */
  from: number;
  /** Hasta (incluido). */
  to: number;
  count: number;
  sum: number;
}

/**
 * Cubetas de igual ancho, con bordes redondos. Si se pasa `edge`, uno de los
 * bordes cae justo ahí (por ejemplo, el umbral de un gasto hormiga), para que
 * ninguna cubeta quede mitad de un lado y mitad del otro.
 *
 * El borde de arriba es el que se incluye: un valor justo en el umbral cae
 * en la cubeta de abajo, que es lo que dice "hasta 15 es hormiga".
 */
export function binValues(values: number[], target = 12, edge?: number): Bin[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const marcas = niceTicks(min, max, target).ticks;
  let paso = marcas.length > 1 ? marcas[1] - marcas[0] : 1;
  if (edge !== undefined && edge > 0 && edge < max) {
    // El paso más cercano al pedido que divide exacto al borde.
    const partes = Math.max(1, Math.round(edge / paso));
    paso = edge / partes;
  }
  const desde = Math.floor(min / paso) * paso;
  const bins: Bin[] = [];
  for (let v = desde; v < max; v += paso) bins.push({ from: v, to: v + paso, count: 0, sum: 0 });
  if (bins.length === 0) bins.push({ from: desde, to: desde + paso, count: 0, sum: 0 });
  for (const v of values) {
    const i = Math.max(0, Math.min(bins.length - 1, Math.ceil((v - desde) / paso) - 1));
    bins[i].count += 1;
    bins[i].sum += v;
  }
  return bins;
}

// ── Embudo ────────────────────────────────────────────────────────────────

export interface FunnelStep {
  value: number;
  /** Qué parte de la etapa anterior llegó a esta, de 0 a 1. `null` en la primera o si la anterior es 0. */
  fromPrevious: number | null;
  /** Qué parte de la primera etapa llegó a esta, de 0 a 1. */
  fromFirst: number | null;
}

/** Las conversiones de un embudo: contra la etapa anterior y contra la primera. */
export function funnelSteps(values: number[]): FunnelStep[] {
  return values.map((v, i) => ({
    value: v,
    fromPrevious: i === 0 || values[i - 1] === 0 ? null : v / values[i - 1],
    fromFirst: i === 0 || values[0] === 0 ? null : v / values[0],
  }));
}
