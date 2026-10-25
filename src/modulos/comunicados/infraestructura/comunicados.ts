/**
 * Los comunicados como los piden las rutas. Solo existe la maqueta:
 * comunicados ficticios en memoria. La versión con Supabase falta: no hay
 * tabla todavía.
 */
import { hoyEnLima } from "@/compartido/formato";
import { fechaDesdeHoy } from "@/compartido/maqueta/consultas";
import { demora } from "@/compartido/maqueta/modo";
import { mundo, nuevoId } from "@/compartido/maqueta/mundo";

import type { ComunicadosPuerto } from "../aplicacion/puertos";
import { puedeEditarse, type Comunicado } from "../dominio/comunicado";

const comunicados: Comunicado[] = [];
for (const e of mundo.edificios) {
  const agregar = (titulo: string, cuerpo: string, audiencia: Comunicado["audiencia"], hace: number, publicado: boolean) =>
    comunicados.push({
      id: `com-${comunicados.length + 1}`,
      edificioId: e.id,
      titulo,
      cuerpo,
      audiencia,
      estado: publicado ? "publicado" : "borrador",
      editadoEl: fechaDesdeHoy(-hace),
      publicadoEl: publicado ? fechaDesdeHoy(-hace) : null,
    });
  agregar(
    "Corte de agua por limpieza de cisterna",
    "Estimados vecinos: el próximo sábado de 8:00 a 14:00 se cortará el agua para limpiar y desinfectar la cisterna. Les recomendamos almacenar agua el día anterior. Gracias por su comprensión.",
    "todos",
    2,
    true,
  );
  agregar(
    "Recibos del mes disponibles",
    "Ya pueden ver su recibo del mes en la aplicación. El pago vence el día 28. Si pagan por transferencia, reporten el pago con el número de operación.",
    "todos",
    9,
    true,
  );
  agregar(
    "Convocatoria a junta de propietarios",
    "Se convoca a los propietarios a la junta ordinaria. Agenda: presupuesto del próximo año, fondo de reserva y mantenimiento de fachada.",
    "propietarios",
    20,
    true,
  );
  agregar("Uso de la terraza los fines de semana", "Recordamos que la terraza se reserva por turnos desde la aplicación.", "todos", 1, false);
}

export const comunicadosMaqueta: ComunicadosPuerto = {
  delEdificio(edificioId) {
    return demora(comunicados.filter((c) => c.edificioId === edificioId).map((c) => ({ ...c })));
  },

  guardar(datos, publicar) {
    const hoy = hoyEnLima();
    if (datos.id) {
      const c = comunicados.find((x) => x.id === datos.id);
      if (!c) return demora({ ok: false as const, mensaje: "El borrador ya no existe." });
      if (!puedeEditarse(c)) return demora({ ok: false as const, mensaje: "Ese comunicado ya está publicado: no se puede cambiar." });
      Object.assign(c, { titulo: datos.titulo, cuerpo: datos.cuerpo, audiencia: datos.audiencia, editadoEl: hoy });
      if (publicar) Object.assign(c, { estado: "publicado", publicadoEl: hoy });
      return demora({ ok: true as const, valor: { ...c } });
    }
    const c: Comunicado = {
      id: nuevoId("com"),
      edificioId: datos.edificioId,
      titulo: datos.titulo,
      cuerpo: datos.cuerpo,
      audiencia: datos.audiencia,
      estado: publicar ? "publicado" : "borrador",
      editadoEl: hoy,
      publicadoEl: publicar ? hoy : null,
    };
    comunicados.push(c);
    return demora({ ok: true as const, valor: { ...c } });
  },
};

export const comunicadosAdaptador: ComunicadosPuerto = comunicadosMaqueta;
