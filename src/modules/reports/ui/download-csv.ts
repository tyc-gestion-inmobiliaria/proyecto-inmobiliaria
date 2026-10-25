/**
 * El CSV en el teléfono: no hay dónde bajar un archivo sin sumar un módulo
 * nativo, así que va por el menú de compartir como texto (correo, WhatsApp,
 * notas). Cuando la app del teléfono lo pida, se guarda como archivo.
 */
import { Share } from "react-native";

export async function descargarCsv(csv: string, nombre: string): Promise<boolean> {
  try {
    await Share.share({ title: nombre, message: csv });
    return true;
  } catch {
    return false;
  }
}
