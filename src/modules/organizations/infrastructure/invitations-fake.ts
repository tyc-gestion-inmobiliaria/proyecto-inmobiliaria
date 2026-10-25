/**
 * Un `InvitacionesPuerto` en memoria, para las pruebas. Repite las reglas de
 * la base que importan a los casos de uso: una abierta por correo y unidad,
 * lo usado no se reenvía ni se cancela, aceptar es idempotente.
 */
import type { FalloAlAceptar, FalloDeInvitacion, InvitacionesPuerto, Resultado } from "../application/ports";
import { estadoDeInvitacion, VIGENCIA_DIAS, type Invitacion, type InvitacionLimpia } from "../domain/invitation";
import type { Miembro } from "../domain/membership";

const DIA_MS = 24 * 60 * 60 * 1000;

export class InvitacionesFalsas implements InvitacionesPuerto {
  readonly invitaciones: (Invitacion & { orgId: string; token: string })[] = [];
  readonly miembrosDe = new Map<string, Miembro[]>();
  /** Los correos mandados, en orden: a quién y con qué enlace. */
  readonly correos: { correo: string; enlace: string }[] = [];
  /** El correo de la cuenta con sesión, para aceptar. */
  cuenta: string | null = null;
  falloForzado?: FalloDeInvitacion;
  sinContrasena = false;
  private siguiente = 1;

  async listar(orgId: string) {
    return this.invitaciones.filter((i) => i.orgId === orgId).map(({ orgId: _o, token: _t, ...i }) => i);
  }

  async miembros(orgId: string) {
    return this.miembrosDe.get(orgId) ?? [];
  }

  async invitar(orgId: string, datos: InvitacionLimpia, volverA: string): Promise<Resultado<FalloDeInvitacion>> {
    if (this.falloForzado) return { ok: false, fallo: this.falloForzado };
    const unidadId = datos.rol === "residente" ? datos.unidadId : null;
    const repetida = this.invitaciones.some(
      (i) => i.orgId === orgId && i.correo === datos.correo && i.unidadId === unidadId && !i.usadaEn && !i.canceladaEn,
    );
    if (repetida) return { ok: false, fallo: "ya-invitada" };
    const n = this.siguiente++;
    const token = `token-${n}`;
    this.invitaciones.push({
      id: `inv-${n}`,
      orgId,
      token,
      correo: datos.correo,
      rol: datos.rol,
      unidadId,
      personaId: "personaId" in datos ? datos.personaId : null,
      nombre: "nombre" in datos ? datos.nombre : null,
      venceEn: new Date(Date.now() + VIGENCIA_DIAS * DIA_MS).toISOString(),
      usadaEn: null,
      canceladaEn: null,
      creadoEn: new Date().toISOString(),
    });
    this.correos.push({ correo: datos.correo, enlace: `${volverA}?token=${token}` });
    return { ok: true };
  }

  private buscar(orgId: string, id: string) {
    return this.invitaciones.find((i) => i.orgId === orgId && i.id === id);
  }

  async reenviar(orgId: string, id: string, volverA: string): Promise<Resultado<FalloDeInvitacion>> {
    if (this.falloForzado) return { ok: false, fallo: this.falloForzado };
    const inv = this.buscar(orgId, id);
    if (!inv || inv.canceladaEn) return { ok: false, fallo: "no-existe" };
    if (inv.usadaEn) return { ok: false, fallo: "ya-usada" };
    inv.token = `token-${this.siguiente++}`;
    inv.venceEn = new Date(Date.now() + VIGENCIA_DIAS * DIA_MS).toISOString();
    this.correos.push({ correo: inv.correo, enlace: `${volverA}?token=${inv.token}` });
    return { ok: true };
  }

  async cancelar(orgId: string, id: string): Promise<Resultado<FalloDeInvitacion>> {
    if (this.falloForzado) return { ok: false, fallo: this.falloForzado };
    const inv = this.buscar(orgId, id);
    if (!inv) return { ok: false, fallo: "no-existe" };
    if (inv.usadaEn) return { ok: false, fallo: "ya-usada" };
    inv.canceladaEn ??= new Date().toISOString();
    return { ok: true };
  }

  async cuentaSinContrasena() {
    return this.sinContrasena;
  }

  async aceptar(token: string): Promise<{ ok: true; orgId: string } | { ok: false; fallo: FalloAlAceptar }> {
    if (!this.cuenta) return { ok: false, fallo: "sin-sesion" };
    const inv = this.invitaciones.find((i) => i.token === token);
    if (!inv) return { ok: false, fallo: "no_existe" };
    const estado = estadoDeInvitacion(inv);
    if (estado === "cancelada") return { ok: false, fallo: "cancelada" };
    if (estado === "aceptada") return inv.correo === this.cuenta ? { ok: true, orgId: inv.orgId } : { ok: false, fallo: "usada" };
    if (estado === "vencida") return { ok: false, fallo: "vencida" };
    if (inv.correo !== this.cuenta) return { ok: false, fallo: "otro_correo" };
    inv.usadaEn = new Date().toISOString();
    return { ok: true, orgId: inv.orgId };
  }
}
