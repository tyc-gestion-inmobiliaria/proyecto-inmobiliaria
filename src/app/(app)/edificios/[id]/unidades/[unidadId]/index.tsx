import { useLocalSearchParams } from "expo-router";

import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { CuentaDeLaUnidad } from "@/modulos/cobranza/ui/cuenta-de-la-unidad";
import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad, type PropsDeCuenta } from "@/modulos/padron/ui/pantalla-unidad";

// La ruta junta los dos módulos: el padrón pone la ficha y la cobranza, su cuenta.
function Cuenta(props: PropsDeCuenta) {
  return <CuentaDeLaUnidad cobranza={cobranza} {...props} />;
}

export default function Unidad() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} unidadId={unidadId} Cuenta={Cuenta} />;
}
