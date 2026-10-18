/**
 * Los puertos del padrón sobre Supabase: tablas `unidad`, `persona`,
 * `unidad_persona` y `cuenta_bancaria`, la vista `participacion_por_edificio`
 * y la función `elegir_responsable_pago`.
 *
 * La RLS decide qué se ve y quién escribe; el filtro por `org_id` la
 * acompaña, para que la consulta diga la administradora que pide y use los
 * índices que empiezan por `org_id`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { clienteSupabase } from "@/compartido/supabase/cliente";

import type {
  CuentasBancariasPuerto,
  PersonasPuerto,
  Resultado,
  UnidadesPuerto,
  VinculosPuerto,
} from "../aplicacion/puertos";
import { esMoneda, type CuentaBancaria, type CuentaLimpia } from "../dominio/cuenta-bancaria";
import { esTipoDocumento, type Persona, type PersonaLimpia } from "../dominio/persona";
import { compararNumeroDeUnidad, type Unidad, type UnidadLimpia } from "../dominio/unidad";
import { esRelacion, type Vinculo } from "../dominio/vinculo";
import { clasificarFalloDelPadron, type ErrorPostgrest } from "./clasificar-fallo";

type ErrorPg = ErrorPostgrest | null;

function cliente(): SupabaseClient {
  const c = clienteSupabase();
  // Sin servidor no hay lista: decir "no hay" sería mentir.
  if (!c) throw new Error("Supabase sin configurar");
  return c;
}

/** Corre una escritura y la traduce a `Resultado`, sin rechazar nunca. */
async function escribir<F, T>(
  pedido: (c: SupabaseClient) => PromiseLike<{ data: F | null; error: ErrorPg }>,
  convertir: (fila: F) => T,
): Promise<Resultado<T>> {
  const c = clienteSupabase();
  if (!c) return { ok: false, fallo: "sin-configurar" };
  try {
    const { data, error } = await pedido(c);
    if (error) return { ok: false, fallo: clasificarFalloDelPadron(error) };
    if (data === null) return { ok: false, fallo: "no-existe" };
    return { ok: true, valor: convertir(data) };
  } catch (error) {
    return { ok: false, fallo: clasificarFalloDelPadron(error as ErrorPg) };
  }
}

async function borrarFila(tabla: string, orgId: string, id: string): Promise<Resultado<null>> {
  return escribir(
    (c) => c.from(tabla).delete().eq("org_id", orgId).eq("id", id).select("id").single<{ id: string }>(),
    () => null,
  );
}

// Unidades ---------------------------------------------------------------------

interface FilaUnidad {
  id: string;
  org_id: string;
  edificio_id: string;
  numero: string;
  tipo: string | null;
  area_m2: number | string | null;
  participacion: number | string | null;
}

// numeric llega como número o como texto según el tamaño: se normaliza.
function numero(valor: number | string | null): number | null {
  return valor === null ? null : Number(valor);
}

function aUnidad(f: FilaUnidad): Unidad {
  return {
    id: f.id,
    orgId: f.org_id,
    edificioId: f.edificio_id,
    numero: f.numero,
    tipo: f.tipo,
    areaM2: numero(f.area_m2),
    participacion: numero(f.participacion),
  };
}

const COLUMNAS_UNIDAD = "id, org_id, edificio_id, numero, tipo, area_m2, participacion";

function filaDeUnidad(u: UnidadLimpia) {
  return { numero: u.numero, tipo: u.tipo, area_m2: u.areaM2, participacion: u.participacion };
}

interface FilaParticipacion {
  unidades: number;
  sin_participacion: number;
  total: number | string;
  diferencia: number | string;
  suma_cien: boolean;
}

export const unidadesSupabase: UnidadesPuerto = {
  async delEdificio(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("unidad")
      .select(COLUMNAS_UNIDAD)
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .returns<FilaUnidad[]>();
    if (error) throw error;
    return (data ?? []).map(aUnidad).sort((a, b) => compararNumeroDeUnidad(a.numero, b.numero));
  },

  async participacion(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("participacion_por_edificio")
      .select("unidades, sin_participacion, total, diferencia, suma_cien")
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .single<FilaParticipacion>();
    if (error) throw error;
    return {
      unidades: data.unidades,
      sinParticipacion: data.sin_participacion,
      total: Number(data.total),
      diferencia: Number(data.diferencia),
      sumaCien: data.suma_cien,
    };
  },

  crear(orgId, edificioId, datos) {
    return escribir(
      (c) =>
        c
          .from("unidad")
          .insert({ org_id: orgId, edificio_id: edificioId, ...filaDeUnidad(datos) })
          .select(COLUMNAS_UNIDAD)
          .single<FilaUnidad>(),
      aUnidad,
    );
  },

  actualizar(orgId, id, datos) {
    return escribir(
      (c) => c.from("unidad").update(filaDeUnidad(datos)).eq("org_id", orgId).eq("id", id).select(COLUMNAS_UNIDAD).single<FilaUnidad>(),
      aUnidad,
    );
  },
};

// Personas ---------------------------------------------------------------------

interface FilaPersona {
  id: string;
  org_id: string;
  nombre: string;
  documento_tipo: string | null;
  documento_numero: string | null;
  correo: string | null;
  telefono: string | null;
  usuario_id: string | null;
}

const COLUMNAS_PERSONA = "id, org_id, nombre, documento_tipo, documento_numero, correo, telefono, usuario_id";

function aPersona(f: FilaPersona): Persona {
  return {
    id: f.id,
    orgId: f.org_id,
    nombre: f.nombre,
    documentoTipo: esTipoDocumento(f.documento_tipo) ? f.documento_tipo : null,
    documentoNumero: f.documento_numero,
    correo: f.correo,
    telefono: f.telefono,
    usuarioId: f.usuario_id,
  };
}

function filaDePersona(p: PersonaLimpia) {
  return {
    nombre: p.nombre,
    documento_tipo: p.documentoTipo,
    documento_numero: p.documentoNumero,
    correo: p.correo,
    telefono: p.telefono,
  };
}

export const personasSupabase: PersonasPuerto = {
  async listar(orgId) {
    const { data, error } = await cliente()
      .from("persona")
      .select(COLUMNAS_PERSONA)
      .eq("org_id", orgId)
      .order("nombre")
      .returns<FilaPersona[]>();
    if (error) throw error;
    return (data ?? []).map(aPersona);
  },

  crear(orgId, datos) {
    return escribir(
      (c) => c.from("persona").insert({ org_id: orgId, ...filaDePersona(datos) }).select(COLUMNAS_PERSONA).single<FilaPersona>(),
      aPersona,
    );
  },

  actualizar(orgId, id, datos) {
    return escribir(
      (c) =>
        c.from("persona").update(filaDePersona(datos)).eq("org_id", orgId).eq("id", id).select(COLUMNAS_PERSONA).single<FilaPersona>(),
      aPersona,
    );
  },

  borrar(orgId, id) {
    return borrarFila("persona", orgId, id);
  },
};

// Vínculos ---------------------------------------------------------------------

interface FilaVinculo {
  id: string;
  org_id: string;
  unidad_id: string;
  persona_id: string;
  relacion: string;
  responsable_pago: boolean;
}

const COLUMNAS_VINCULO = "id, org_id, unidad_id, persona_id, relacion, responsable_pago";

function aVinculo(f: FilaVinculo): Vinculo {
  // La base solo acepta las tres relaciones; si llegara otra, es un bug del esquema.
  if (!esRelacion(f.relacion)) throw new Error(`Relación desconocida: ${f.relacion}`);
  return {
    id: f.id,
    orgId: f.org_id,
    unidadId: f.unidad_id,
    personaId: f.persona_id,
    relacion: f.relacion,
    responsablePago: f.responsable_pago,
  };
}

async function vinculosPor(orgId: string, columna: "unidad_id" | "persona_id", valor: string): Promise<Vinculo[]> {
  const { data, error } = await cliente()
    .from("unidad_persona")
    .select(COLUMNAS_VINCULO)
    .eq("org_id", orgId)
    .eq(columna, valor)
    .order("creado_en")
    .returns<FilaVinculo[]>();
  if (error) throw error;
  return (data ?? []).map(aVinculo);
}

export const vinculosSupabase: VinculosPuerto = {
  deLaUnidad(orgId, unidadId) {
    return vinculosPor(orgId, "unidad_id", unidadId);
  },

  deLaPersona(orgId, personaId) {
    return vinculosPor(orgId, "persona_id", personaId);
  },

  vincular(orgId, datos) {
    return escribir(
      (c) =>
        c
          .from("unidad_persona")
          .insert({ org_id: orgId, unidad_id: datos.unidadId, persona_id: datos.personaId, relacion: datos.relacion })
          .select(COLUMNAS_VINCULO)
          .single<FilaVinculo>(),
      aVinculo,
    );
  },

  cambiarRelacion(orgId, id, relacion) {
    return escribir(
      (c) =>
        c.from("unidad_persona").update({ relacion }).eq("org_id", orgId).eq("id", id).select(COLUMNAS_VINCULO).single<FilaVinculo>(),
      aVinculo,
    );
  },

  async elegirResponsable(_orgId, id) {
    const c = clienteSupabase();
    if (!c) return { ok: false, fallo: "sin-configurar" };
    try {
      const { error } = await c.rpc("elegir_responsable_pago", { p_vinculo_id: id });
      if (error) return { ok: false, fallo: clasificarFalloDelPadron(error) };
      return { ok: true, valor: null };
    } catch (error) {
      return { ok: false, fallo: clasificarFalloDelPadron(error as ErrorPg) };
    }
  },

  desvincular(orgId, id) {
    return borrarFila("unidad_persona", orgId, id);
  },
};

// Cuentas bancarias --------------------------------------------------------------

interface FilaCuenta {
  id: string;
  org_id: string;
  edificio_id: string;
  nombre: string;
  banco: string;
  numero: string;
  cci: string | null;
  moneda: string;
}

const COLUMNAS_CUENTA = "id, org_id, edificio_id, nombre, banco, numero, cci, moneda";

function aCuenta(f: FilaCuenta): CuentaBancaria {
  return {
    id: f.id,
    orgId: f.org_id,
    edificioId: f.edificio_id,
    nombre: f.nombre,
    banco: f.banco,
    numero: f.numero,
    cci: f.cci,
    moneda: esMoneda(f.moneda) ? f.moneda : "PEN",
  };
}

function filaDeCuenta(c: CuentaLimpia) {
  return { nombre: c.nombre, banco: c.banco, numero: c.numero, cci: c.cci, moneda: c.moneda };
}

export const cuentasBancariasSupabase: CuentasBancariasPuerto = {
  async delEdificio(orgId, edificioId) {
    const { data, error } = await cliente()
      .from("cuenta_bancaria")
      .select(COLUMNAS_CUENTA)
      .eq("org_id", orgId)
      .eq("edificio_id", edificioId)
      .order("nombre")
      .returns<FilaCuenta[]>();
    if (error) throw error;
    return (data ?? []).map(aCuenta);
  },

  crear(orgId, edificioId, datos) {
    return escribir(
      (c) =>
        c
          .from("cuenta_bancaria")
          .insert({ org_id: orgId, edificio_id: edificioId, ...filaDeCuenta(datos) })
          .select(COLUMNAS_CUENTA)
          .single<FilaCuenta>(),
      aCuenta,
    );
  },

  actualizar(orgId, id, datos) {
    return escribir(
      (c) =>
        c.from("cuenta_bancaria").update(filaDeCuenta(datos)).eq("org_id", orgId).eq("id", id).select(COLUMNAS_CUENTA).single<FilaCuenta>(),
      aCuenta,
    );
  },

  borrar(orgId, id) {
    return borrarFila("cuenta_bancaria", orgId, id);
  },
};
