import { Slot } from "expo-router";

import { edificiosDelContextoSupabase } from "@/compartido/contexto/edificios-del-contexto-supabase";
import { ProveedorContexto } from "@/compartido/contexto/proveedor-contexto";
import { Marco } from "@/compartido/ui/marco";
import { membresiasSupabase } from "@/modulos/organizaciones/infraestructura/membresias-supabase";
import { ProveedorOrganizacion, useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { useSesion } from "@/modulos/organizaciones/ui/sesion";

export default function LayoutConSesion() {
  const { cuenta } = useSesion();
  // La clave por cuenta descarta las membresías de quien salió.
  return (
    <ProveedorOrganizacion key={cuenta?.id ?? "sin-cuenta"} puerto={membresiasSupabase}>
      <ConContexto />
    </ProveedorOrganizacion>
  );
}

function ConContexto() {
  const { enCurso } = useOrganizacion();
  const orgId = enCurso?.orgId ?? null;
  // La clave por administradora vuelve a la cartera entera al cambiar de administradora.
  return (
    <ProveedorContexto key={orgId ?? "sin-administradora"} orgId={orgId} puerto={edificiosDelContextoSupabase}>
      <Marco>
        <Slot />
      </Marco>
    </ProveedorContexto>
  );
}
