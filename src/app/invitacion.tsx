import { invitaciones } from "@/modulos/organizaciones/infraestructura/invitaciones";
import { sesion } from "@/modulos/organizaciones/infraestructura/sesion";
import { PantallaInvitacion } from "@/modulos/organizaciones/ui/pantalla-invitacion";

export default function Invitacion() {
  return <PantallaInvitacion sesion={sesion} invitaciones={invitaciones} />;
}
