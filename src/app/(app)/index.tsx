import { estadoCartera } from "@/modulos/cartera/infraestructura/estado-cartera";
import { PantallaInicio } from "@/modulos/cartera/ui/pantalla-inicio";
import { edificios } from "@/modulos/padron/infraestructura/padron";

export default function Inicio() {
  return <PantallaInicio edificios={edificios} estado={estadoCartera} />;
}
