import { invitaciones } from "@/modules/organizations/infrastructure/invitations";
import { PantallaUsuarios } from "@/modules/organizations/ui/users-screen";

export default function Usuarios() {
  return <PantallaUsuarios invitaciones={invitaciones} />;
}
