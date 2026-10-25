import type { UnidadesParaInvitarPuerto } from "@/modules/organizations/application/ports";
import { invitaciones } from "@/modules/organizations/infrastructure/invitations";
import { PantallaInvitar } from "@/modules/organizations/ui/invite-screen";
import { padron as padronDeLaRuta } from "@/modules/registry/infrastructure/registry";

// La ruta junta los dos módulos: organizaciones invita y el padrón pone los
// edificios, las unidades y quién es quién en cada una.
const padron: UnidadesParaInvitarPuerto = {
  edificios: async (orgId) => (await padronDeLaRuta.edificios.listar(orgId)).map((e) => ({ id: e.id, nombre: e.nombre })),
  unidades: async (orgId, edificioId) =>
    (await padronDeLaRuta.unidades.delEdificio(orgId, edificioId)).map((u) => ({ id: u.id, numero: u.numero })),
  personas: async (orgId, unidadId) => {
    const [vinculos, personas] = await Promise.all([
      padronDeLaRuta.vinculos.deLaUnidad(orgId, unidadId),
      padronDeLaRuta.personas.listar(orgId),
    ]);
    const deLaUnidad = new Set(vinculos.map((v) => v.personaId));
    return personas
      .filter((p) => deLaUnidad.has(p.id))
      .map((p) => ({ id: p.id, nombre: p.nombre, tieneCuenta: p.usuarioId !== null }));
  },
};

export default function Invitar() {
  return <PantallaInvitar invitaciones={invitaciones} padron={padron} />;
}
