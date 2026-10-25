import { invitaciones } from "@/modules/organizations/infrastructure/invitations";
import { sesion } from "@/modules/organizations/infrastructure/session";
import { PantallaInvitacion } from "@/modules/organizations/ui/invitation-screen";

export default function Invitacion() {
  return <PantallaInvitacion sesion={sesion} invitaciones={invitaciones} />;
}
