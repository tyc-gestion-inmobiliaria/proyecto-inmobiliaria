/**
 * La maqueta: la app entera sin servidor, sobre datos ficticios en memoria,
 * para avanzar el diseño mientras la base no está. Se enciende al construir
 * con `EXPO_PUBLIC_DATOS=maqueta`; sin eso, todo va a Supabase.
 *
 * Cada módulo elige su adaptador con esta marca en `infraestructura/`, y las
 * rutas importan ese elegido: ninguna pantalla sabe en qué modo corre.
 */
export const EN_MAQUETA = process.env.EXPO_PUBLIC_DATOS === "maqueta";

/** Lo que tarda una respuesta de la maqueta, para que se vean los estados de carga. */
export const DEMORA_MS = 250;

/** Dónde guarda la maqueta la cuenta con sesión, en el navegador. */
export const CLAVE_DE_SESION = "maqueta-sesion";

/**
 * El correo de la cuenta con sesión en la maqueta, para lo que la base sabría
 * por `auth.uid()` (quién tomó una lectura). `null` fuera del navegador.
 */
export function correoEnLaMaqueta(): string | null {
  try {
    const texto = typeof localStorage === "undefined" ? null : localStorage.getItem(CLAVE_DE_SESION);
    return texto ? ((JSON.parse(texto) as { correo?: string }).correo ?? null) : null;
  } catch {
    return null;
  }
}

export function demora<T>(valor: T): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor), DEMORA_MS));
}
