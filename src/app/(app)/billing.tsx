import { useLocalSearchParams } from "expo-router";

import { ConEdificio } from "@/shared/ui/section";
import { cobranza } from "@/modules/billing/infrastructure/billing";
import { PantallaCierre } from "@/modules/billing/ui/closing-screen";
import { notificaciones } from "@/modules/notifications/infrastructure/notifications";
import { CorreosDelCierre } from "@/modules/notifications/ui/closing-emails";

function Correos(props: { orgId: string; cierreId: string }) {
  return <CorreosDelCierre notificaciones={notificaciones} {...props} />;
}

export default function Cobranza() {
  const { paso } = useLocalSearchParams<{ paso?: string }>();
  return <ConEdificio titulo="Cobranza">{(id) => <PantallaCierre cobranza={cobranza} edificioId={id} paso={paso} Correos={Correos} />}</ConEdificio>;
}
