import { Slot } from "expo-router";

import { Marco } from "@/compartido/ui/marco";
import { membresiasSupabase } from "@/modulos/organizaciones/infraestructura/membresias-supabase";
import { ProveedorOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { useSesion } from "@/modulos/organizaciones/ui/sesion";

export default function LayoutConSesion() {
  const { cuenta } = useSesion();
  // La clave por cuenta descarta las membresías de quien salió.
  return (
    <ProveedorOrganizacion key={cuenta?.id ?? "sin-cuenta"} puerto={membresiasSupabase}>
      <Marco>
        <Slot />
      </Marco>
    </ProveedorOrganizacion>
  );
}
