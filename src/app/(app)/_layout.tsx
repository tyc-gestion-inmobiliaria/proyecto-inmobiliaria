import { Slot, usePathname } from "expo-router";

import type { EdificiosDelContextoPuerto } from "@/compartido/contexto/contexto";
import { ProveedorContexto } from "@/compartido/contexto/proveedor-contexto";
import { Marco } from "@/compartido/ui/marco";
import { membresias } from "@/modulos/organizaciones/infraestructura/sesion";
import { ProveedorOrganizacion, useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { useSesion } from "@/modulos/organizaciones/ui/sesion";
import { edificios } from "@/modulos/padron/infraestructura/padron";

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
