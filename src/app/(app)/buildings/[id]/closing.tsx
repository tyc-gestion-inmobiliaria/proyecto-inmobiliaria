import { useLocalSearchParams } from "expo-router";

import { cobranza } from "@/modules/billing/infrastructure/billing";
import { PantallaCierre } from "@/modules/billing/ui/closing-screen";
import { notificaciones } from "@/modules/notifications/infrastructure/notifications";
import { CorreosDelCierre } from "@/modules/notifications/ui/closing-emails";

// La ruta junta los dos módulos: la cobranza pone el cierre y las notificaciones, sus correos.
function Correos(props: { orgId: string; cierreId: string }) {
  return <CorreosDelCierre notificaciones={notificaciones} {...props} />;
}

export default function Cierre() {
  const { id, paso } = useLocalSearchParams<{ id: string; paso?: string }>();
  return <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} Correos={Correos} />;
}
