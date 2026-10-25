import { useLocalSearchParams } from "expo-router";

import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaCuenta } from "@/modulos/padron/ui/pantalla-cuenta";

export default function EditarCuenta() {
  const { id, cuentaId } = useLocalSearchParams<{ id: string; cuentaId: string }>();
  return <PantallaCuenta cuentas={padron.cuentas} edificioId={id} id={cuentaId} />;
}
