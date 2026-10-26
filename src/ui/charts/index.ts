/**
 * Las gráficas del kit. Quince formas, cada una para un trabajo:
 *
 * | Trabajo | Forma |
 * |---|---|
 * | Tendencia en el tiempo | `LineChart`, `AreaChart` |
 * | Comparar series por periodo | `ColumnChart` |
 * | La parte de cada serie por periodo | `StackedColumnChart`, `AreaChart stacked` |
 * | Ranking de muchas categorías | `BarList` |
 * | Parte de un total, pocas porciones | `DonutChart` |
 * | Parte de un total, muchas porciones | `Treemap` |
 * | Arriba o abajo del cero | `DivergingBarChart` |
 * | De un total a otro, paso a paso | `WaterfallChart` |
 * | Patrón por día del calendario | `CalendarHeatmap` |
 * | Cruce de dos dimensiones | `MatrixHeatmap` |
 * | Dos medidas por cosa | `ScatterChart` |
 * | Cómo se reparten los valores | `Histogram` |
 * | Real contra meta | `BulletChart` |
 * | Antes y después | `DumbbellChart` |
 * | Un número | `StatTile` (con `Sparkline`) |
 * | Un total repartido en pocos estados | `StatusBar` |
 * | Cuántos llegan a cada etapa | `FunnelChart` |
 */
export { Y_AXIS_WIDTH, YGrid } from "./axis";
export { BarList } from "./bar-list";
export type { BarListItem } from "./bar-list";
export { BulletChart } from "./bullet-chart";
export type { BulletRow } from "./bullet-chart";
export { CalendarHeatmap } from "./calendar-heatmap";
export type { CalendarDay } from "./calendar-heatmap";
export {
  arcPath,
  areaPath,
  binValues,
  compactNumber,
  funnelSteps,
  labelStep,
  linePath,
  niceTicks,
  scaleLinear,
  sequentialStep,
  seriesColor,
  squarify,
} from "./chart-logic";
export type { Bin, FunnelStep, Point, TreemapRect } from "./chart-logic";
export {
  ChartCard,
  ChartGrid,
  ChartLegend,
  ChartTooltip,
  DIMMED_OPACITY,
  markOpacity,
  toggleSelection,
  useHoveredMark,
  useMeasuredWidth,
} from "./chart-parts";
export type { ChartFormat, ChartTable, LegendItem, SelectableChartProps, TooltipRow } from "./chart-parts";
export { ColumnChart, StackedColumnChart } from "./column-chart";
export type { ChartCategory, ChartSeries, ColumnChartProps } from "./column-chart";
export { DivergingBarChart } from "./diverging-bar-chart";
export { DonutChart } from "./donut-chart";
export type { DonutItem } from "./donut-chart";
export { DumbbellChart } from "./dumbbell-chart";
export { FunnelChart } from "./funnel-chart";
export type { FunnelStage } from "./funnel-chart";
export type { DumbbellRow } from "./dumbbell-chart";
export { binKey, Histogram } from "./histogram";
export { AreaChart, LineChart } from "./line-chart";
export type { LineChartProps } from "./line-chart";
export { matrixKey, MatrixHeatmap } from "./matrix-heatmap";
export type { MatrixAxisItem } from "./matrix-heatmap";
export { ScatterChart } from "./scatter-chart";
export type { ScatterGroup, ScatterPoint } from "./scatter-chart";
export { Sparkline, StatTile } from "./stat-tile";
export { StatusBar } from "./status-bar";
export type { StatusBarItem } from "./status-bar";
export type { StatDelta } from "./stat-tile";
export { Treemap } from "./treemap";
export type { TreemapItem } from "./treemap";
export { WaterfallChart } from "./waterfall-chart";
export type { WaterfallStep } from "./waterfall-chart";
