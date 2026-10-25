import { pagos } from "@/modules/payments/infrastructure/payments";
import { PantallaPagos } from "@/modules/payments/ui/payments-screen";

export default function Pagos() {
  return <PantallaPagos pagos={pagos} />;
}
