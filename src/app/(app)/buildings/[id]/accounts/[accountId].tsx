import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaCuenta } from "@/modules/registry/ui/account-screen";

export default function EditarCuenta() {
  const { id, accountId: cuentaId } = useLocalSearchParams<{ id: string; accountId: string }>();
  return <PantallaCuenta cuentas={padron.cuentas} edificioId={id} id={cuentaId} />;
}
