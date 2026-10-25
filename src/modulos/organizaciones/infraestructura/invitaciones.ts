/**
 * Las invitaciones como las piden las rutas: Supabase o, en la maqueta, en
 * memoria sobre los datos compartidos (`mundo.invitaciones` y
 * `mundo.miembros`).
 *
 * La maqueta repite las reglas de la base que la pantalla tiene que saber
 * decir: una abierta por correo y unidad, lo usado no se reenvía ni se
 * cancela, aceptar es idempotente y pide el mismo correo. No manda correos:
 * el enlace de cada invitación es `/invitacion?token=…` con su token, y los
 * de la semilla son `demo-1`, `demo-2` y `demo-3`.
 */
import { demora, EN_MAQUETA } from "@/compartido/maqueta/modo";
import { mundo, nuevoId, type InvitacionM } from "@/compartido/maqueta/mundo";

import type { FalloAlAceptar, FalloDeInvitacion, InvitacionesPuerto, Resultado } from "../aplicacion/puertos";
import { estadoDeInvitacion, VIGENCIA_DIAS, type Invitacion } from "../dominio/invitacion";
import { invitacionesSupabase } from "./invitaciones-supabase";
import { sesion } from "./sesion";

const DIA_MS = 24 * 60 * 60 * 1000;

const vence = () => new Date(Date.now() + VIGENCIA_DIAS * DIA_MS).toISOString();

function aInvitacion({ orgId: _o, token: _t, ...i }: InvitacionM): Invitacion {
  return i;
}

const invitacionesDeMaqueta: InvitacionesPuerto = {
  listar: (orgId) =>
    demora(
      mundo.invitaciones
        .filter((i) => i.orgId === orgId)
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
        .map(aInvitacion),
    ),
  miembros: (orgId) =>
    demora(mundo.miembros.filter((m) => m.orgId === orgId).map(({ orgId: _o, ...m }) => m)),

  invitar(orgId, datos): Promise<Resultado<FalloDeInvitacion>> {
    const unidadId = datos.rol === "residente" ? datos.unidadId : null;
    const repetida = mundo.invitaciones.some(
      (i) => i.orgId === orgId && i.correo === datos.correo && i.unidadId === unidadId && !i.usadaEn && !i.canceladaEn,
    );
    if (repetida) return demora({ ok: false, fallo: "ya-invitada" });
    if (unidadId && !mundo.unidades.some((u) => u.id === unidadId && u.orgId === orgId)) return demora({ ok: false, fallo: "invalido" });
    mundo.invitaciones.push({
      id: nuevoId("inv"),
      orgId,
      correo: datos.correo,
      rol: datos.rol,
      unidadId,
      personaId: "personaId" in datos ? datos.personaId : null,
      nombre: "nombre" in datos ? datos.nombre : null,
      token: nuevoId("token"),
      venceEn: vence(),
      usadaEn: null,
      canceladaEn: null,
      creadoEn: new Date().toISOString(),
    });
    return demora({ ok: true });
  },

  reenviar(orgId, id): Promise<Resultado<FalloDeInvitacion>> {
    const inv = mundo.invitaciones.find((i) => i.orgId === orgId && i.id === id);
    if (!inv || inv.canceladaEn) return demora({ ok: false, fallo: "no-existe" });
    if (inv.usadaEn) return demora({ ok: false, fallo: "ya-usada" });
    Object.assign(inv, { token: nuevoId("token"), venceEn: vence() });
    return demora({ ok: true });
  },

  cancelar(orgId, id): Promise<Resultado<FalloDeInvitacion>> {
    const inv = mundo.invitaciones.find((i) => i.orgId === orgId && i.id === id);
    if (!inv) return demora({ ok: false, fallo: "no-existe" });
    if (inv.usadaEn) return demora({ ok: false, fallo: "ya-usada" });
    inv.canceladaEn ??= new Date().toISOString();
    return demora({ ok: true });
  },

  cuentaSinContrasena: () => demora(false),

  async aceptar(token): Promise<{ ok: true; orgId: string } | { ok: false; fallo: FalloAlAceptar }> {
    const cuenta = await sesion.cuentaActual();
    if (!cuenta) return demora({ ok: false, fallo: "sin-sesion" });
    const inv = mundo.invitaciones.find((i) => i.token === token);
    if (!inv) return demora({ ok: false, fallo: "no_existe" });
    const estado = estadoDeInvitacion(inv);
    if (estado === "cancelada") return demora({ ok: false, fallo: "cancelada" });
    if (estado === "aceptada") return demora(inv.correo === cuenta.correo ? { ok: true, orgId: inv.orgId } : { ok: false, fallo: "usada" });
    if (estado === "vencida") return demora({ ok: false, fallo: "vencida" });
    if (inv.correo !== cuenta.correo) return demora({ ok: false, fallo: "otro_correo" });
    inv.usadaEn = new Date().toISOString();
    if (!mundo.miembros.some((m) => m.orgId === inv.orgId && m.correo === cuenta.correo)) {
      mundo.miembros.push({ usuarioId: cuenta.id, orgId: inv.orgId, correo: cuenta.correo, rol: inv.rol, activa: true });
    }
    return demora({ ok: true, orgId: inv.orgId });
  },
};

export const invitaciones: InvitacionesPuerto = EN_MAQUETA ? invitacionesDeMaqueta : invitacionesSupabase;
