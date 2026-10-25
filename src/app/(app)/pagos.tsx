import { pagos } from "@/modulos/pagos/infraestructura/pagos";
import { PantallaPagos } from "@/modulos/pagos/ui/pantalla-pagos";

export default function Pagos() {
  return <PantallaPagos pagos={pagos} />;
}
