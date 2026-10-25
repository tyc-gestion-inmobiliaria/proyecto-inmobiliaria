import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modules/registry/infrastructure/registry";
import { PantallaCuenta } from "@/modules/registry/ui/account-screen";

export default function NuevaCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaCuenta cuentas={padron.cuentas} edificioId={id} />;
}
