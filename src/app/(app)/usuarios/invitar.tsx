import type { UnidadesParaInvitarPuerto } from "@/modulos/organizaciones/aplicacion/puertos";
import { invitacionesSupabase } from "@/modulos/organizaciones/infraestructura/invitaciones-supabase";
import { PantallaInvitar } from "@/modulos/organizaciones/ui/pantalla-invitar";
import { padronSupabase } from "@/modulos/padron/infraestructura/padron";

// La ruta junta los dos módulos: organizaciones invita y el padrón pone los
// edificios, las unidades y quién es quién en cada una.
const padron: UnidadesParaInvitarPuerto = {
  edificios: async (orgId) => (await padronSupabase.edificios.listar(orgId)).map((e) => ({ id: e.id, nombre: e.nombre })),
  unidades: async (orgId, edificioId) =>
    (await padronSupabase.unidades.delEdificio(orgId, edificioId)).map((u) => ({ id: u.id, numero: u.numero })),
  personas: async (orgId, unidadId) => {
    const [vinculos, personas] = await Promise.all([
      padronSupabase.vinculos.deLaUnidad(orgId, unidadId),
      padronSupabase.personas.listar(orgId),
    ]);
    const deLaUnidad = new Set(vinculos.map((v) => v.personaId));
    return personas
      .filter((p) => deLaUnidad.has(p.id))
      .map((p) => ({ id: p.id, nombre: p.nombre, tieneCuenta: p.usuarioId !== null }));
  },
};

export default function Invitar() {
  return <PantallaInvitar invitaciones={invitacionesSupabase} padron={padron} />;
}
