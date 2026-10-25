import { invitaciones } from "@/modulos/organizaciones/infraestructura/invitaciones";
import { PantallaUsuarios } from "@/modulos/organizaciones/ui/pantalla-usuarios";

export default function Usuarios() {
  return <PantallaUsuarios invitaciones={invitaciones} />;
}
