import { ConEdificio } from "@/shared/ui/section";
import { accesosAdaptador } from "@/modules/access/infrastructure/access";
import { PantallaAccesos } from "@/modules/access/ui/access-screen";

export default function Accesos() {
  return <ConEdificio titulo="Accesos y paquetes">{(id) => <PantallaAccesos key={id} accesos={accesosAdaptador} edificioId={id} />}</ConEdificio>;
}
