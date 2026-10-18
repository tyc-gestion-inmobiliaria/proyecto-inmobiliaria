/**
 * El padrón en memoria, para las pruebas y la demo sin servidor. Reproduce
 * las reglas que la base hace cumplir y que la pantalla tiene que saber
 * decir: número de unidad, documento y número de cuenta únicos, un solo
 * vínculo por persona y unidad, un solo responsable de pago por unidad, y
 * todo dentro de una administradora.
 */
import type {
  CuentasBancariasPuerto,
  NuevoVinculo,
  PersonasPuerto,
  Resultado,
  UnidadesPuerto,
  VinculosPuerto,
} from "../aplicacion/puertos";
import type { CuentaBancaria, CuentaLimpia } from "../dominio/cuenta-bancaria";
import { resumirParticipacion } from "../dominio/participacion";
import type { Persona, PersonaLimpia } from "../dominio/persona";
import { compararNumeroDeUnidad, type Unidad } from "../dominio/unidad";
import type { Relacion, Vinculo } from "../dominio/vinculo";

const bien = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
const repetido = { ok: false, fallo: "repetido" } as const;
const noExiste = { ok: false, fallo: "no-existe" } as const;

export class PadronFalso implements UnidadesPuerto, PersonasPuerto, VinculosPuerto {
  unidades: Unidad[] = [];
  personas: Persona[] = [];
  vinculos: Vinculo[] = [];
  cuentas: CuentaBancaria[] = [];
  private siguiente = 1;

  constructor(inicial: { unidades?: Unidad[]; personas?: Persona[]; vinculos?: Vinculo[]; cuentas?: CuentaBancaria[] } = {}) {
    this.unidades = [...(inicial.unidades ?? [])];
    this.personas = [...(inicial.personas ?? [])];
    this.vinculos = [...(inicial.vinculos ?? [])];
    this.cuentas = [...(inicial.cuentas ?? [])];
  }

  private id(prefijo: string): string {
    return `${prefijo}-${this.siguiente++}`;
  }

  // UnidadesPuerto --------------------------------------------------------------

  async delEdificio(orgId: string, edificioId: string): Promise<Unidad[]> {
    return this.unidades
      .filter((u) => u.orgId === orgId && u.edificioId === edificioId)
      .sort((a, b) => compararNumeroDeUnidad(a.numero, b.numero));
  }

  async participacion(orgId: string, edificioId: string) {
    const unidades = await this.delEdificio(orgId, edificioId);
    return resumirParticipacion(unidades.map((u) => u.participacion));
  }

  // PersonasPuerto ----------------------------------------------------------------

  async listar(orgId: string): Promise<Persona[]> {
    return this.personas.filter((p) => p.orgId === orgId).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  private documentoOcupado(orgId: string, datos: PersonaLimpia, salvo?: string): boolean {
    return (
      datos.documentoNumero !== null &&
      this.personas.some(
        (p) =>
          p.orgId === orgId && p.id !== salvo && p.documentoTipo === datos.documentoTipo && p.documentoNumero === datos.documentoNumero,
      )
    );
  }

  async crear(orgId: string, datos: PersonaLimpia): Promise<Resultado<Persona>> {
    if (this.documentoOcupado(orgId, datos)) return repetido;
    const persona: Persona = { id: this.id("persona"), orgId, usuarioId: null, ...datos };
    this.personas.push(persona);
    return bien(persona);
  }

  async actualizar(orgId: string, id: string, datos: PersonaLimpia): Promise<Resultado<Persona>> {
    const i = this.personas.findIndex((p) => p.orgId === orgId && p.id === id);
    if (i < 0) return noExiste;
    if (this.documentoOcupado(orgId, datos, id)) return repetido;
    this.personas[i] = { ...this.personas[i], ...datos };
    return bien(this.personas[i]);
  }

  async borrar(orgId: string, id: string): Promise<Resultado<null>> {
    const antes = this.personas.length;
    this.personas = this.personas.filter((p) => !(p.orgId === orgId && p.id === id));
    if (this.personas.length === antes) return noExiste;
    // Como la clave foránea con `on delete cascade`.
    this.vinculos = this.vinculos.filter((v) => !(v.orgId === orgId && v.personaId === id));
    return bien(null);
  }

  // VinculosPuerto ----------------------------------------------------------------

  async deLaUnidad(orgId: string, unidadId: string): Promise<Vinculo[]> {
    return this.vinculos.filter((v) => v.orgId === orgId && v.unidadId === unidadId);
  }

  async deLaPersona(orgId: string, personaId: string): Promise<Vinculo[]> {
    return this.vinculos.filter((v) => v.orgId === orgId && v.personaId === personaId);
  }

  async vincular(orgId: string, datos: NuevoVinculo): Promise<Resultado<Vinculo>> {
    // Clave foránea compuesta: la unidad y la persona son de esta administradora.
    const unidad = this.unidades.some((u) => u.orgId === orgId && u.id === datos.unidadId);
    const persona = this.personas.some((p) => p.orgId === orgId && p.id === datos.personaId);
    if (!unidad || !persona) return noExiste;
    if (this.vinculos.some((v) => v.orgId === orgId && v.unidadId === datos.unidadId && v.personaId === datos.personaId)) return repetido;
    const vinculo: Vinculo = { id: this.id("vinculo"), orgId, ...datos, responsablePago: false };
    this.vinculos.push(vinculo);
    return bien(vinculo);
  }

  async cambiarRelacion(orgId: string, id: string, relacion: Relacion): Promise<Resultado<Vinculo>> {
    const v = this.vinculos.find((x) => x.orgId === orgId && x.id === id);
    if (!v) return noExiste;
    v.relacion = relacion;
    return bien(v);
  }

  async elegirResponsable(orgId: string, id: string): Promise<Resultado<null>> {
    const elegido = this.vinculos.find((v) => v.orgId === orgId && v.id === id);
    if (!elegido) return noExiste;
    for (const v of this.vinculos) {
      if (v.orgId === orgId && v.unidadId === elegido.unidadId) v.responsablePago = v.id === id;
    }
    return bien(null);
  }

  async desvincular(orgId: string, id: string): Promise<Resultado<null>> {
    const antes = this.vinculos.length;
    this.vinculos = this.vinculos.filter((v) => !(v.orgId === orgId && v.id === id));
    return this.vinculos.length === antes ? noExiste : bien(null);
  }

  // CuentasBancariasPuerto -------------------------------------------------------
  // Sus métodos se llaman igual que los de unidades y personas: el puerto se
  // entrega aparte, con `comoCuentas()`, sobre el mismo estado.

  comoCuentas(): CuentasBancariasPuerto {
    return {
      delEdificio: async (orgId, edificioId) => this.cuentas.filter((c) => c.orgId === orgId && c.edificioId === edificioId),
      crear: async (orgId, edificioId, datos) => {
        if (this.cuentas.some((c) => c.orgId === orgId && c.edificioId === edificioId && c.numero === datos.numero)) return repetido;
        const cuenta: CuentaBancaria = { id: this.id("cuenta"), orgId, edificioId, ...datos };
        this.cuentas.push(cuenta);
        return bien(cuenta);
      },
      actualizar: async (orgId, id, datos: CuentaLimpia) => {
        const c = this.cuentas.find((x) => x.orgId === orgId && x.id === id);
        if (!c) return noExiste;
        if (this.cuentas.some((x) => x.id !== id && x.orgId === orgId && x.edificioId === c.edificioId && x.numero === datos.numero)) {
          return repetido;
        }
        Object.assign(c, datos);
        return bien(c);
      },
      borrar: async (orgId, id) => {
        const antes = this.cuentas.length;
        this.cuentas = this.cuentas.filter((c) => !(c.orgId === orgId && c.id === id));
        return this.cuentas.length === antes ? noExiste : bien(null);
      },
    };
  }
}
