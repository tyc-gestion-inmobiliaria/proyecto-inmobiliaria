/**
 * Lo que se le dice al administrador cuando la base rechaza una escritura
 * del padrón que no es de un campo: va sobre los botones, no junto a uno.
 */
import type { FalloDelPadron } from "./ports";

const MENSAJE: Record<FalloDelPadron, string> = {
  repetido: "Ya existe. Revisa la lista antes de volver a intentarlo.",
  "otro-responsable": "La unidad ya tiene otro responsable de pago. Vuelve a abrirla y elígelo otra vez.",
  "sin-permiso": "Tu rol no permite hacer este cambio. Pídeselo a un administrador.",
  "no-existe": "Ya no está en el padrón. Vuelve a la lista y ábrelo otra vez.",
  invalido: "Algún dato no se aceptó. Revisa el formulario e inténtalo de nuevo.",
  "sin-conexion": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "sin-configurar": "Esta versión de la app no tiene servidor configurado. Avisa a soporte.",
  desconocido: "No se pudo guardar. Inténtalo de nuevo en un momento.",
};

export function mensajeDelFallo(fallo: FalloDelPadron): string {
  return MENSAJE[fallo];
}
