import { estadoCartera } from "@/modulos/cartera/infraestructura/estado-cartera";
import { PantallaInicio } from "@/modulos/cartera/ui/pantalla-inicio";
import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { descargar } from "@/modulos/cobranza/ui/recibos";
import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { edificios } from "@/modulos/padron/infraestructura/padron";
import { pagos } from "@/modulos/pagos/infraestructura/pagos";
import { ReportarPago } from "@/modulos/pagos/ui/reportar-pago";
import { residente } from "@/modulos/residente/infraestructura/residente";
import { PantallaMiUnidad, type PropsDeReportar } from "@/modulos/residente/ui/pantalla-mi-unidad";

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
