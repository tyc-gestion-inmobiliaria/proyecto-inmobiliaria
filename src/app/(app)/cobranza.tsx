import { useLocalSearchParams } from "expo-router";

import { ConEdificio } from "@/compartido/ui/seccion";
import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { PantallaCierre } from "@/modulos/cobranza/ui/pantalla-cierre";
import { notificaciones } from "@/modulos/notificaciones/infraestructura/notificaciones";
import { CorreosDelCierre } from "@/modulos/notificaciones/ui/correos-del-cierre";

function Correos(props: { orgId: string; cierreId: string }) {
  return <CorreosDelCierre notificaciones={notificaciones} {...props} />;
}

export default function Cobranza() {
  const { paso } = useLocalSearchParams<{ paso?: string }>();
  return <ConEdificio titulo="Cobranza">{(id) => <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} Correos={Correos} />}</ConEdificio>;
}
