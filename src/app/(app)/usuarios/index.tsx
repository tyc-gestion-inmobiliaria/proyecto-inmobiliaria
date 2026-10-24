import { invitacionesSupabase } from "@/modulos/organizaciones/infraestructura/invitaciones-supabase";
import { PantallaUsuarios } from "@/modulos/organizaciones/ui/pantalla-usuarios";

export default function Usuarios() {
  return <PantallaUsuarios invitaciones={invitacionesSupabase} />;
}
