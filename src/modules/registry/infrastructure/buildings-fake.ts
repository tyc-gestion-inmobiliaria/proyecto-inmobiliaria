/**
 * `EdificiosPuerto` en memoria, para las pruebas. Imita lo que hace la base:
 * el nombre idéntico dentro de la administradora se rechaza, y cada
 * administradora ve solo lo suyo.
 */
import type { Edificio } from "../domain/building";
import type { EdificiosPuerto, FalloAlGuardar, ResultadoGuardado } from "../application/ports";

export class EdificiosFalso implements EdificiosPuerto {
  readonly edificios: Edificio[];
  /** Cuántas veces se intentó escribir. */
  escrituras = 0;
  private siguiente = 1;

  constructor(
    iniciales: Edificio[] = [],
    /** Si se da, toda escritura falla con esto. */
    private readonly falla?: FalloAlGuardar,
  ) {
    this.edificios = [...iniciales];
  }

  async contar(orgId: string) {
    return this.edificios.filter((e) => e.orgId === orgId).length;
  }

  async listar(orgId: string) {
    return this.edificios.filter((e) => e.orgId === orgId).map((e) => ({ ...e }));
  }

  async crear(orgId: string, datos: { nombre: string; direccion: string | null }): Promise<ResultadoGuardado> {
    this.escrituras += 1;
    if (this.falla) return { ok: false, fallo: this.falla };
    if (this.repetido(orgId, datos.nombre)) return { ok: false, fallo: "nombre-repetido" };
    const edificio = { id: `e${this.siguiente++}`, orgId, ...datos };
    this.edificios.push(edificio);
    return { ok: true, edificio: { ...edificio } };
  }

  async actualizar(orgId: string, id: string, datos: { nombre: string; direccion: string | null }): Promise<ResultadoGuardado> {
    this.escrituras += 1;
    if (this.falla) return { ok: false, fallo: this.falla };
    const edificio = this.edificios.find((e) => e.id === id && e.orgId === orgId);
    if (!edificio) return { ok: false, fallo: "no-existe" };
    if (this.repetido(orgId, datos.nombre, id)) return { ok: false, fallo: "nombre-repetido" };
    Object.assign(edificio, datos);
    return { ok: true, edificio: { ...edificio } };
  }

  private repetido(orgId: string, nombre: string, salvo?: string) {
    return this.edificios.some((e) => e.orgId === orgId && e.id !== salvo && e.nombre === nombre);
  }
}
