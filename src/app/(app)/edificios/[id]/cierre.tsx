import { useLocalSearchParams } from "expo-router";

import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { PantallaCierre } from "@/modulos/cobranza/ui/pantalla-cierre";
import { notificaciones } from "@/modulos/notificaciones/infraestructura/notificaciones";
import { CorreosDelCierre } from "@/modulos/notificaciones/ui/correos-del-cierre";

// La ruta junta los dos módulos: la cobranza pone el cierre y las notificaciones, sus correos.
function Correos(props: { orgId: string; cierreId: string }) {
  return <CorreosDelCierre notificaciones={notificaciones} {...props} />;
}

export default function Cierre() {
  const { id, paso } = useLocalSearchParams<{ id: string; paso?: string }>();
  return <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} Correos={Correos} />;
}
