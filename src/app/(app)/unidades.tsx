import { ConEdificio } from "@/compartido/ui/seccion";
import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidades } from "@/modulos/padron/ui/pantalla-unidades";

export default function Unidades() {
  return <ConEdificio titulo="Unidades y personas">{(id) => <PantallaUnidades padron={padron} edificioId={id} />}</ConEdificio>;
}
