/**
 * Los datos de la maqueta: una administradora ficticia con tres edificios en
 * estados distintos, para que cada pantalla tenga algo que mostrar.
 *
 * - Edificio Los Olivos: padrón completo, cuenta bancaria y el mes emitido.
 * - Residencial Las Acacias: padrón completo y el cierre en lecturas.
 * - Torre del Parque: unidades sin participación y sin cuenta bancaria.
 *
 * Todo es inventado y genérico: ni nombres ni documentos de personas reales.
 * Vive en memoria y lo comparten los adaptadores de maqueta de cada módulo,
 * para que lo que se agrega en el padrón se vea en la cobranza. Al recargar
 * la página vuelve a empezar.
 *
 * Las formas copian las del dominio de cada módulo sin importarlas: cada
 * adaptador las recibe por tipado estructural.
 */

export const ORG_DEMO = "org-demo";
export const NOMBRE_ORG_DEMO = "Administradora Demo";

export interface EdificioM {
  id: string;
  orgId: string;
  nombre: string;
  direccion: string | null;
}

export interface UnidadM {
  id: string;
  orgId: string;
  edificioId: string;
  numero: string;
  tipo: string | null;
  areaM2: number | null;
  participacion: number | null;
}

export interface PersonaM {
  id: string;
  orgId: string;
  nombre: string;
  documentoTipo: "dni" | "ce" | "pasaporte" | "ruc" | null;
  documentoNumero: string | null;
  correo: string | null;
  telefono: string | null;
  usuarioId: string | null;
}

export interface VinculoM {
  id: string;
  orgId: string;
  unidadId: string;
  personaId: string;
  relacion: "propietario" | "inquilino" | "residente";
  responsablePago: boolean;
}

export interface CuentaM {
  id: string;
  orgId: string;
  edificioId: string;
  nombre: string;
  banco: string;
  numero: string;
  cci: string | null;
  moneda: "PEN" | "USD";
}

export interface CierreM {
  id: string;
  orgId: string;
  edificioId: string;
  periodo: string;
  estado: "borrador" | "emitido";
  paso: 1 | 2 | 3 | 4;
  montoAgua: number;
  umbralAtipico: number;
  vence: string | null;
}

export interface LecturaM {
  id: string;
  cierreId: string;
  unidadId: string;
  unidadNumero: string;
  anterior: number | null;
  actual: number | null;
  foto: string | null;
}

export interface PartidaM {
  cierreId: string;
  concepto: string;
  monto: number;
}

export interface ReciboM {
  id: string;
  numero: number;
  cierreId: string;
  edificioId: string;
  unidadId: string;
  unidadNumero: string;
  periodo: string;
  participacion: number;
  consumo: number | null;
  cuota: number;
  agua: number;
  deudaPrevia: number;
  total: number;
  vence: string;
  emitidoEn: string;
}

export interface Mundo {
  edificios: EdificioM[];
  unidades: UnidadM[];
  personas: PersonaM[];
  vinculos: VinculoM[];
  cuentas: CuentaM[];
  cierres: CierreM[];
  lecturas: LecturaM[];
  partidas: PartidaM[];
  recibos: ReciboM[];
}

const NOMBRES = ["Ana", "Luis", "Carmen", "Jorge", "Rosa", "Miguel", "Elena", "Raúl", "Patricia", "Diego", "Lucía", "Andrés"];
const APELLIDOS = ["Quispe", "Rojas", "Flores", "Vargas", "Castro", "Mendoza", "Ramos", "Silva", "Paredes", "Huamán", "Torres", "Salazar"];

/** El periodo de hoy en Lima, como su primer día ("2026-10-01"), desplazado `meses`. */
function periodo(meses = 0): string {
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Un día del mes en curso, como fecha ISO. */
function diaDelMes(dia: number): string {
  return `${periodo().slice(0, 7)}-${String(dia).padStart(2, "0")}`;
}

/** Partes iguales que suman exactamente 100, con el resto en la última. */
function participaciones(n: number): number[] {
  const parte = Math.floor(10000 / n) / 100;
  const ultima = Math.round((100 - parte * (n - 1)) * 100) / 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? ultima : parte));
}

function numeros(pisos: number, porPiso: number): string[] {
  const r: string[] = [];
  for (let p = 1; p <= pisos; p++) for (let u = 1; u <= porPiso; u++) r.push(`${p}0${u}`);
  return r;
}

function crearMundo(): Mundo {
  const m: Mundo = { edificios: [], unidades: [], personas: [], vinculos: [], cuentas: [], cierres: [], lecturas: [], partidas: [], recibos: [] };
  let persona = 0;
  let recibo = 1;

  const edificios = [
    { id: "ed-olivos", nombre: "Edificio Los Olivos", direccion: "Av. Los Olivos 120", pisos: 4, porPiso: 3, sinParticipacion: 0, cuenta: true, cierre: "emitido" },
    { id: "ed-acacias", nombre: "Residencial Las Acacias", direccion: "Calle Las Acacias 455", pisos: 6, porPiso: 3, sinParticipacion: 0, cuenta: true, cierre: "lecturas" },
    { id: "ed-parque", nombre: "Torre del Parque", direccion: "Jr. del Parque 89", pisos: 8, porPiso: 3, sinParticipacion: 3, cuenta: false, cierre: null },
  ] as const;

  for (const e of edificios) {
    m.edificios.push({ id: e.id, orgId: ORG_DEMO, nombre: e.nombre, direccion: e.direccion });
    const nums = numeros(e.pisos, e.porPiso);
    const partes = participaciones(nums.length);
    nums.forEach((numero, i) => {
      const unidadId = `${e.id}-u${numero}`;
      m.unidades.push({
        id: unidadId,
        orgId: ORG_DEMO,
        edificioId: e.id,
        numero,
        tipo: "Departamento",
        areaM2: 70 + ((i * 7) % 45),
        participacion: i >= nums.length - e.sinParticipacion ? null : partes[i],
      });
      const nombre = `${NOMBRES[persona % NOMBRES.length]} ${APELLIDOS[(persona * 5 + 3) % APELLIDOS.length]}`;
      const personaId = `p${++persona}`;
      m.personas.push({
        id: personaId,
        orgId: ORG_DEMO,
        nombre,
        documentoTipo: "dni",
        documentoNumero: String(40000000 + persona * 1373).slice(0, 8),
        correo: `persona${persona}@ejemplo.test`,
        telefono: `9${String(10000000 + persona * 7919).slice(0, 8)}`,
        usuarioId: null,
      });
      m.vinculos.push({ id: `v${persona}`, orgId: ORG_DEMO, unidadId, personaId, relacion: "propietario", responsablePago: true });
    });

    if (e.cuenta) {
      m.cuentas.push({
        id: `${e.id}-cta`,
        orgId: ORG_DEMO,
        edificioId: e.id,
        nombre: "Mantenimiento",
        banco: "Banco Demo",
        numero: `191-${e.id.length}0457812-0-${e.pisos}2`,
        cci: `0021910${e.id.length}0457812${e.pisos}052`,
        moneda: "PEN",
      });
    }

    if (e.cierre) {
      const cierreId = `${e.id}-${periodo()}`;
      const emitido = e.cierre === "emitido";
      m.cierres.push({
        id: cierreId,
        orgId: ORG_DEMO,
        edificioId: e.id,
        periodo: periodo(),
        estado: emitido ? "emitido" : "borrador",
        paso: emitido ? 4 : 1,
        montoAgua: emitido ? 480 : 0,
        umbralAtipico: 50,
        vence: emitido ? diaDelMes(28) : null,
      });
      const partidas = [
        { concepto: "Limpieza y conserjería", monto: 2400 },
        { concepto: "Mantenimiento de ascensor", monto: 650 },
        { concepto: "Luz de áreas comunes", monto: 380 },
        { concepto: "Fondo de reserva", monto: 300 },
      ];
      if (emitido) for (const p of partidas) m.partidas.push({ cierreId, ...p });
      const unidades = m.unidades.filter((u) => u.edificioId === e.id);
      const totalCuota = partidas.reduce((n, p) => n + p.monto, 0);
      unidades.forEach((u, i) => {
        const anterior = 100 + i * 11;
        const consumo = 8 + ((i * 3) % 9);
        // En las acacias falta la mitad de las lecturas: ese es el trabajo del paso 1.
        const actual = emitido || i % 2 === 0 ? anterior + consumo : null;
        m.lecturas.push({ id: `${cierreId}-l${u.numero}`, cierreId, unidadId: u.id, unidadNumero: u.numero, anterior, actual, foto: null });
        if (emitido) {
          const cuota = Math.round(totalCuota * (u.participacion ?? 0)) / 100;
          const agua = Math.round(consumo * 4.5 * 100) / 100;
          const deudaPrevia = i % 5 === 0 ? 185.5 : 0;
          m.recibos.push({
            id: `rec-${recibo}`,
            numero: recibo++,
            cierreId,
            edificioId: e.id,
            unidadId: u.id,
            unidadNumero: u.numero,
            periodo: periodo(),
            participacion: u.participacion ?? 0,
            consumo,
            cuota,
            agua,
            deudaPrevia,
            total: Math.round((cuota + agua + deudaPrevia) * 100) / 100,
            vence: diaDelMes(28),
            emitidoEn: `${diaDelMes(5)}T10:00:00-05:00`,
          });
        }
      });
    }
  }
  return m;
}

export const mundo: Mundo = crearMundo();

let siguiente = 1;
/** Un id nuevo para lo que se agrega en la maqueta. */
export function nuevoId(prefijo: string): string {
  return `${prefijo}-m${siguiente++}`;
}
