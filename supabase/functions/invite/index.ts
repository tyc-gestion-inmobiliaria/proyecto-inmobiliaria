/**
 * Edge Function `invitar` (PB-23): invita a una persona a una administradora
 * y le manda el correo. También reenvía una invitación abierta.
 *
 * POST, con la sesión de quien invita en `Authorization`:
 *
 *   { "accion": "invitar", "orgId", "correo", "rol", "volverA",
 *     "unidadId"?, "personaId"?, "nombre"?, "relacion"? }
 *   { "accion": "reenviar", "orgId", "id", "volverA" }
 *
 * Contesta `{ ok: true, id }` o `{ ok: false, fallo }` con el código HTTP del
 * caso. `fallo` es el que entiende el adaptador de la app
 * (`FalloDeInvitacion`).
 *
 * Cómo se reparte la seguridad:
 *   * La fila se escribe con el cliente **de quien llama**: la RLS de
 *     `invitacion` exige que sea administrador de esa organización, y las
 *     claves foráneas compuestas, que la unidad y la persona sean de ella.
 *     La comprobación explícita del rol de abajo solo adelanta un 403 claro.
 *   * Solo el envío del correo usa la clave de servicio, que llega por las
 *     variables del entorno de la función (nunca está en el código).
 *   * El token va en el enlace; en la base queda su sha256.
 *
 * El correo:
 *   * Cuenta nueva: `auth.admin.inviteUserByEmail` crea la cuenta y manda la
 *     plantilla de invitación.
 *   * Cuenta que ya existe (otra administradora, o un residente invitado a
 *     otra unidad): Auth no la vuelve a invitar, así que se le manda un
 *     enlace mágico (`signInWithOtp` sin crear cuenta). `generateLink` no
 *     manda el correo, y la función no tiene proveedor de correo propio.
 *   En local, los dos caen en Mailpit.
 *
 * El enlace de Auth vence según `auth.email.otp_expiry` (una hora en local);
 * la invitación, en 7 días. Si vence el enlace, se reenvía.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "@supabase/supabase-js/cors";

const ROLES = ["administrador", "personal", "residente"] as const;
const RELACIONES = ["propietario", "inquilino", "residente"] as const;
/** Lo mismo que el `default` de `invitacion.vence_en`. */
const VIGENCIA_DIAS = 7;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fallo =
  | "ya-invitada"
  | "ya-usada"
  | "sin-permiso"
  | "no-existe"
  | "invalido"
  | "correo-no-enviado"
  | "sin-sesion"
  | "desconocido";

const ESTADO_HTTP: Record<Fallo, number> = {
  "ya-invitada": 409,
  "ya-usada": 409,
  "sin-permiso": 403,
  "no-existe": 404,
  invalido: 400,
  "correo-no-enviado": 502,
  "sin-sesion": 401,
  desconocido: 500,
};

function responder(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallar(fallo: Fallo, detalle?: unknown): Response {
  if (detalle) console.error(fallo, detalle);
  return responder({ ok: false, fallo }, ESTADO_HTTP[fallo]);
}

/** La clave del entorno: las nuevas (`SUPABASE_*_KEYS`, JSON) o las de siempre. */
function clave(nueva: string, vieja: string): string {
  const json = Deno.env.get(nueva);
  if (json) {
    try {
      const valores = Object.values(JSON.parse(json) as Record<string, string>);
      if (valores[0]) return valores[0];
    } catch {
      // Sigue con la vieja.
    }
  }
  const valor = Deno.env.get(vieja);
  if (!valor) throw new Error(`Falta ${vieja} en el entorno de la función`);
  return valor;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** 32 bytes al azar: el token en claro (va en el enlace) y su sha256 en hexadecimal (va a la base). */
async function nuevoToken(): Promise<{ token: string; hashBytea: string }> {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
  // PostgREST recibe un bytea como texto en hexadecimal con el prefijo \x.
  return { token, hashBytea: `\\x${hex}` };
}

/** `volverA` lo manda la app (es su propia dirección). Auth igual lo compara con su lista de direcciones permitidas. */
function enlaceConToken(volverA: unknown, token: string): string | null {
  if (typeof volverA !== "string") return null;
  let url: URL;
  try {
    url = new URL(volverA);
  } catch {
    return null;
  }
  if (url.protocol === "javascript:" || url.protocol === "data:") return null;
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function uuid(valor: unknown): string | null {
  return typeof valor === "string" && FORMATO_UUID.test(valor) ? valor : null;
}

/** Manda el correo: invitación si la cuenta es nueva, enlace mágico si ya existe. */
async function mandarCorreo(admin: SupabaseClient, correo: string, enlace: string): Promise<{ ok: boolean; detalle?: unknown }> {
  const invitado = await admin.auth.admin.inviteUserByEmail(correo, { redirectTo: enlace });
  if (!invitado.error) return { ok: true };
  if (invitado.error.code !== "email_exists" && invitado.error.status !== 422) return { ok: false, detalle: invitado.error };
  const magico = await admin.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: false, emailRedirectTo: enlace },
  });
  return magico.error ? { ok: false, detalle: magico.error } : { ok: true };
}

/** Traduce el error de PostgREST (código de Postgres) a lo que entiende la app. */
function falloDeLaBase(error: { code?: string; message?: string }): Fallo {
  if (error.code === "23505") return "ya-invitada";
  if (error.code === "23503" || error.code === "23514" || error.code === "22P02") return "invalido";
  if (error.code === "42501") return "sin-permiso";
  return "desconocido";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ ok: false, fallo: "invalido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return fallar("sin-sesion");

  let url: string;
  let anon: string;
  let servicio: string;
  try {
    url = Deno.env.get("SUPABASE_URL") ?? "";
    anon = clave("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    servicio = clave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  } catch (error) {
    return fallar("desconocido", error);
  }

  const comoQuienLlama = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: usuario, error: errorDeSesion } = await comoQuienLlama.auth.getUser(autorizacion.replace(/^Bearer\s+/i, ""));
  if (errorDeSesion || !usuario.user) return fallar("sin-sesion");

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return fallar("invalido");
  }

  const orgId = uuid(cuerpo.orgId);
  if (!orgId) return fallar("invalido");

  // Adelanta un 403 claro; la RLS lo vuelve a exigir al escribir.
  const { data: membresia } = await comoQuienLlama
    .from("membresia")
    .select("rol")
    .eq("org_id", orgId)
    .eq("usuario_id", usuario.user.id)
    .eq("activa", true)
    .maybeSingle();
  if (membresia?.rol !== "administrador") return fallar("sin-permiso");

  const { token, hashBytea } = await nuevoToken();
  const enlace = enlaceConToken(cuerpo.volverA, token);
  if (!enlace) return fallar("invalido");

  if (cuerpo.accion === "invitar") {
    const correo = texto(cuerpo.correo)?.toLowerCase() ?? null;
    const rol = cuerpo.rol;
    if (!correo || correo.length > 254 || !FORMATO_CORREO.test(correo)) return fallar("invalido");
    if (typeof rol !== "string" || !(ROLES as readonly string[]).includes(rol)) return fallar("invalido");

    const fila: Record<string, unknown> = { org_id: orgId, correo, rol, token_hash: hashBytea };
    if (rol === "residente") {
      fila.unidad_id = uuid(cuerpo.unidadId);
      fila.persona_id = uuid(cuerpo.personaId);
      fila.nombre = texto(cuerpo.nombre);
      fila.relacion = (RELACIONES as readonly unknown[]).includes(cuerpo.relacion) ? cuerpo.relacion : null;
      if (fila.persona_id) {
        fila.nombre = null;
        fila.relacion = null;
      }
    }

    const { data, error } = await comoQuienLlama.from("invitacion").insert(fila).select("id").single();
    if (error) return fallar(falloDeLaBase(error), error);

    const envio = await mandarCorreo(admin, correo, enlace);
    if (!envio.ok) {
      // Sin correo, la invitación no le sirve a nadie: se borra para poder volver a intentarlo.
      await comoQuienLlama.from("invitacion").delete().eq("id", data.id);
      return fallar("correo-no-enviado", envio.detalle);
    }
    return responder({ ok: true, id: data.id });
  }

  if (cuerpo.accion === "reenviar") {
    const id = uuid(cuerpo.id);
    if (!id) return fallar("invalido");
    const { data: actual, error: errorAlLeer } = await comoQuienLlama
      .from("invitacion")
      .select("id, correo, usada_en, cancelada_en")
      .eq("org_id", orgId)
      .eq("id", id)
      .maybeSingle();
    if (errorAlLeer) return fallar(falloDeLaBase(errorAlLeer), errorAlLeer);
    if (!actual || actual.cancelada_en) return fallar("no-existe");
    if (actual.usada_en) return fallar("ya-usada");

    const venceEn = new Date(Date.now() + VIGENCIA_DIAS * 24 * 60 * 60 * 1000).toISOString();
    // El token nuevo reemplaza al anterior: el enlace viejo deja de servir.
    const { data: cambiada, error } = await comoQuienLlama
      .from("invitacion")
      .update({ token_hash: hashBytea, vence_en: venceEn })
      .eq("org_id", orgId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return fallar(falloDeLaBase(error), error);
    if (!cambiada) return fallar("no-existe");

    const envio = await mandarCorreo(admin, actual.correo, enlace);
    if (!envio.ok) return fallar("correo-no-enviado", envio.detalle);
    return responder({ ok: true, id });
  }

  return fallar("invalido");
});
