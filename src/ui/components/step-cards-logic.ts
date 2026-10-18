/**
 * La lógica de `StepCards`, sin React Native, para probarla con `node --test`.
 */

/** Cómo está un paso. No depende de su posición: un paso de después puede estar hecho y uno de antes trabado. */
export type StepCardStatus = "done" | "current" | "blocked" | "upcoming";

export interface StepCardTexts {
  done: string;
  current: string;
  blocked: string;
  upcoming: string;
}

export const STEP_CARD_TEXTS: StepCardTexts = { done: "Hecho", current: "En curso", blocked: "Con bloqueos", upcoming: "Por hacer" };

/** El signo del círculo: ✓ hecho, ! trabado, el número en los demás. Es lo que se ve sin distinguir colores. */
export function stepSign(status: StepCardStatus, index: number): string {
  if (status === "done") return "✓";
  if (status === "blocked") return "!";
  return String(index + 1);
}

/** El primer paso sin terminar: adonde conviene llevar a quien entra. `undefined` si todos están hechos. */
export function firstOpenStep<K extends string>(steps: { key: K; status: StepCardStatus }[]): K | undefined {
  return steps.find((s) => s.status !== "done")?.key;
}

/** Lo que oye el lector de pantalla: "Paso 2 de 4, Presupuesto, con bloqueos, falta cargarlo". */
export function stepAccessibilityLabel(label: string, index: number, total: number, status: StepCardStatus, detail: string | undefined, texts: StepCardTexts): string {
  return [`Paso ${index + 1} de ${total}`, label, texts[status].toLowerCase(), detail].filter(Boolean).join(", ");
}
