import { edificios } from "@/modulos/padron/infraestructura/padron";
import { PantallaEdificios } from "@/modulos/padron/ui/pantalla-edificios";

export default function Edificios() {
  return <PantallaEdificios edificios={edificios} />;
}
