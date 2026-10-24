import { ConEdificio } from "@/compartido/ui/seccion";
import { accesosAdaptador } from "@/modulos/accesos/infraestructura/accesos";
import { PantallaAccesos } from "@/modulos/accesos/ui/pantalla-accesos";

export default function Accesos() {
  return <ConEdificio titulo="Accesos y paquetes">{(id) => <PantallaAccesos key={id} accesos={accesosAdaptador} edificioId={id} />}</ConEdificio>;
}
