import { useLocalSearchParams } from "expo-router";

import { cobranzaSupabase } from "@/modulos/cobranza/infraestructura/cobranza-supabase";
import { CuentaDeLaUnidad } from "@/modulos/cobranza/ui/cuenta-de-la-unidad";
import { padronSupabase } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad, type PropsDeCuenta } from "@/modulos/padron/ui/pantalla-unidad";

// La ruta junta los dos módulos: el padrón pone la ficha y la cobranza, su cuenta.
function Cuenta(props: PropsDeCuenta) {
  return <CuentaDeLaUnidad cobranza={cobranzaSupabase} {...props} />;
}

export default function Unidad() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaUnidad padron={padronSupabase} edificioId={id} unidadId={unidadId} Cuenta={Cuenta} />;
}
