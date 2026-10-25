import { ConEdificio } from "@/shared/ui/section";
import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaUnidades } from "@/modules/registry/ui/units-screen";

export default function Unidades() {
  return <ConEdificio titulo="Unidades y personas">{(id) => <PantallaUnidades padron={padron} edificioId={id} />}</ConEdificio>;
}
