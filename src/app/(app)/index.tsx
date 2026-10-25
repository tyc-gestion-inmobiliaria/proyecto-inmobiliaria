import { estadoCartera } from "@/modules/portfolio/infrastructure/portfolio-status";
import { PantallaInicio } from "@/modules/portfolio/ui/home-screen";
import { cobranza } from "@/modules/billing/infrastructure/billing";
import { descargar } from "@/modules/billing/ui/receipts";
import { useOrganizacion } from "@/modules/organizations/ui/organization";
import { edificios } from "@/modules/registry/infrastructure/registry";
import { pagos } from "@/modules/payments/infrastructure/payments";
import { ReportarPago } from "@/modules/payments/ui/report-payment";
import { residente } from "@/modules/resident/infrastructure/resident";
import { PantallaMiUnidad, type PropsDeReportar } from "@/modules/resident/ui/my-unit-screen";

// La ruta junta los módulos: el residente ve su unidad (cobranza y pagos);
// el equipo, la cartera.
function Reportar(props: PropsDeReportar) {
  return <ReportarPago pagos={pagos} {...props} />;
}

const descargarRecibo = (orgId: string, recibo: Parameters<typeof descargar>[2]) => descargar(cobranza, orgId, recibo);

export default function Inicio() {
  const { enCurso } = useOrganizacion();
  if (enCurso?.rol === "residente") {
    return <PantallaMiUnidad residente={residente} cobranza={cobranza} pagos={pagos} Reportar={Reportar} descargar={descargarRecibo} />;
  }
  return <PantallaInicio edificios={edificios} estado={estadoCartera} />;
}
