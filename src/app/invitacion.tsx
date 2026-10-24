import { invitacionesSupabase } from "@/modulos/organizaciones/infraestructura/invitaciones-supabase";
import { sesionSupabase } from "@/modulos/organizaciones/infraestructura/sesion-supabase";
import { PantallaInvitacion } from "@/modulos/organizaciones/ui/pantalla-invitacion";

export default function Invitacion() {
  return <PantallaInvitacion sesion={sesionSupabase} invitaciones={invitacionesSupabase} />;
}
