import { edificios } from "@/modulos/padron/infraestructura/padron";
import { PantallaEdificio } from "@/modulos/padron/ui/pantalla-edificio";

export default function NuevoEdificio() {
  return <PantallaEdificio edificios={edificios} />;
}
