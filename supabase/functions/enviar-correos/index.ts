/**
 * Edge Function `enviar-correos` (PB-30): vacía la bandeja `envio`.
 *
 * La llama un programador de tareas (pg_cron con pg_net, o el del proveedor)
 * cada pocos minutos, con la clave de servicio en `Authorization`. Toma hasta
 * 50 envíos pendientes cuyo turno llegó, manda cada correo y anota el
 * resultado:
 *   * enviado → `enviado`, con la fecha;
 *   * falla → suma un intento y vuelve a la cola más tarde (5, 10, 20, 40
 *     minutos); al quinto, queda `fallido` con el error, a la vista del
 *     administrador.
 *
 * El proveedor de correo: Resend, por su API HTTP (supuesto: el backlog lo
 * deja a elegir; cambiarlo es cambiar `mandar`). Necesita `RESEND_API_KEY` y
 * `CORREO_REMITENTE` en los secretos de la función. Sin ellos no se manda
 * nada ni se gastan intentos: el envío sigue pendiente con el aviso "Falta
 * configurar el proveedor de correo", para que se vea por qué no salió.
 *
 * Usa la clave de servicio (salta la RLS) porque escribe en la bandeja, que
 * desde la API no se escribe. Vive en el entorno de la función, nunca en la app.
 */
import { createClient } from "@supabase/supabase-js";

import { cuerpo, html, MAXIMO_DE_INTENTOS, proximoIntento, type Datos, type TipoDeEnvio } from "./contenido.ts";

interface Envio {
  id: string;
  tipo: TipoDeEnvio;
  correo: string;
  asunto: string;
  datos: Datos;
  intentos: number;
}

/** La clave del entorno: las nuevas (`SUPABASE_*_KEYS`, JSON) o las de siempre. */
function clave(nueva: string, vieja: string): string | null {
  const json = Deno.env.get(nueva);
  if (json) {
    try {
      const valores = Object.values(JSON.parse(json) as Record<string, string>);
      if (valores[0]) return valores[0];
    } catch {
      // Sigue con la vieja.
    }
  }
  return Deno.env.get(vieja) ?? null;
}

async function mandar(e: Envio, apiKey: string, remitente: string): Promise<string | null> {
  const texto = cuerpo(e.tipo, e.datos);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": e.id },
      body: JSON.stringify({ from: remitente, to: [e.correo], subject: e.asunto, text: texto, html: html(texto) }),
    });
    if (r.ok) return null;
    return `El proveedor contestó ${r.status}: ${(await r.text()).slice(0, 300)}`;
  } catch (error) {
    return `No se pudo llegar al proveedor: ${String(error).slice(0, 300)}`;
  }
}

Deno.serve(async (req) => {
  const servicio = clave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!servicio || !url) return new Response("Falta configurar la función", { status: 500 });
  // Solo el programador de tareas, con la clave de servicio.
  if (req.headers.get("Authorization") !== `Bearer ${servicio}`) return new Response("No autorizado", { status: 401 });

  const base = createClient(url, servicio, { auth: { persistSession: false } });
  const { data, error } = await base
    .from("envio")
    .select("id, tipo, correo, asunto, datos, intentos")
    .eq("estado", "pendiente")
    .lte("proximo_intento", new Date().toISOString())
    .order("proximo_intento")
    .limit(50)
    .returns<Envio[]>();
  if (error) {
    console.error("leer la bandeja", error);
    return new Response("No se pudo leer la bandeja", { status: 500 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const remitente = Deno.env.get("CORREO_REMITENTE");
  const resumen = { enviados: 0, reintentar: 0, fallidos: 0, sinProveedor: 0 };

  for (const e of data ?? []) {
    if (!apiKey || !remitente) {
      await base.from("envio").update({ ultimo_error: "Falta configurar el proveedor de correo" }).eq("id", e.id);
      resumen.sinProveedor++;
      continue;
    }
    const fallo = await mandar(e, apiKey, remitente);
    if (!fallo) {
      await base.from("envio").update({ estado: "enviado", enviado_en: new Date().toISOString(), ultimo_error: null }).eq("id", e.id);
      resumen.enviados++;
      continue;
    }
    const intentos = e.intentos + 1;
    if (intentos >= MAXIMO_DE_INTENTOS) {
      await base.from("envio").update({ estado: "fallido", intentos, ultimo_error: fallo }).eq("id", e.id);
      resumen.fallidos++;
    } else {
      await base
        .from("envio")
        .update({ intentos, ultimo_error: fallo, proximo_intento: proximoIntento(intentos).toISOString() })
        .eq("id", e.id);
      resumen.reintentar++;
    }
  }

  return new Response(JSON.stringify(resumen), { headers: { "Content-Type": "application/json" } });
});
