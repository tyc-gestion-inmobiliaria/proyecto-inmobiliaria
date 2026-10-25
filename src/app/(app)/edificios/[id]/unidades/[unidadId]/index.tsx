import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { cobranza } from "@/modulos/cobranza/infraestructura/cobranza";
import { CuentaDeLaUnidad } from "@/modulos/cobranza/ui/cuenta-de-la-unidad";
import { useOrganizacion } from "@/modulos/organizaciones/ui/organizacion";
import { padron } from "@/modulos/padron/infraestructura/padron";
import { PantallaUnidad, type PropsDeCuenta } from "@/modulos/padron/ui/pantalla-unidad";
import { puedeGestionarPagos } from "@/modulos/pagos/dominio/pago";
import { pagos } from "@/modulos/pagos/infraestructura/pagos";
import { PagosDeLaUnidad } from "@/modulos/pagos/ui/pagos-de-la-unidad";

// La ruta junta los módulos: el padrón pone la ficha, la cobranza su cuenta y
// los pagos su acción y su pestaña. Registrar un pago vuelve a leer la cuenta.
function Cuenta({ orgId, unidadId, children }: PropsDeCuenta) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enCurso } = useOrganizacion();
  const [version, setVersion] = useState(0);
  return (
    <CuentaDeLaUnidad cobranza={cobranza} orgId={orgId} unidadId={unidadId} version={version}>
      {(cuenta) => (
        <PagosDeLaUnidad
          pagos={pagos}
          orgId={orgId}
          edificioId={id}
          unidadId={unidadId}
          gestiona={puedeGestionarPagos(enCurso?.rol ?? "")}
          onCambio={() => setVersion((v) => v + 1)}
        >
          {(pagos) => children({ ...cuenta, accion: pagos.accion, pestanas: [...cuenta.pestanas, ...pagos.pestanas] })}
        </PagosDeLaUnidad>
      )}
    </CuentaDeLaUnidad>
  );
}

export default function Unidad() {
  const { id, unidadId } = useLocalSearchParams<{ id: string; unidadId: string }>();
  return <PantallaUnidad padron={padron} edificioId={id} unidadId={unidadId} Cuenta={Cuenta} />;
}
