import { Slot, usePathname } from "expo-router";

import type { EdificiosDelContextoPuerto } from "@/shared/context/context";
import { ProveedorContexto } from "@/shared/context/context-provider";
import { Marco } from "@/shared/ui/frame";
import { membresias } from "@/modules/organizations/infrastructure/session";
import { ProveedorOrganizacion, useOrganizacion } from "@/modules/organizations/ui/organization";
import { useSesion } from "@/modules/organizations/ui/session";
import { edificios } from "@/modules/registry/infrastructure/registry";

/** El selector de edificio lee del padrón; solo necesita el id y el nombre. */
const edificiosDelContexto: EdificiosDelContextoPuerto = {
  listar: async (orgId) => (await edificios.listar(orgId)).map((e) => ({ id: e.id, nombre: e.nombre })),
};

export default function LayoutConSesion() {
  const { cuenta } = useSesion();
  // La clave por cuenta descarta las membresías de quien salió.
  return (
    <ProveedorOrganizacion key={cuenta?.id ?? "sin-cuenta"} puerto={membresias}>
      <ConContexto />
    </ProveedorOrganizacion>
  );
}

function ConContexto() {
  const { enCurso } = useOrganizacion();
  const ruta = usePathname();
  const orgId = enCurso?.orgId ?? null;
  // La clave por administradora vuelve a la cartera entera al cambiar de administradora.
  return (
    <ProveedorContexto key={orgId ?? "sin-administradora"} orgId={orgId} ruta={ruta} puerto={edificiosDelContexto}>
      <Marco>
        <Slot />
      </Marco>
    </ProveedorContexto>
  );
}
