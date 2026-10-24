import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaCuenta } from "@/modulos/padron/ui/pantalla-cuenta";

export default function NuevaCuenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaCuenta cuentas={padron.cuentas} edificioId={id} />;
}
