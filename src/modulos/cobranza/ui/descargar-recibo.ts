/**
 * El recibo en PDF, en el teléfono: se imprime a un archivo y se abre el menú
 * de compartir (guardar, mandar por WhatsApp o por correo).
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export async function descargarRecibo(html: string, nombre: string): Promise<boolean> {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: nombre, UTI: "com.adobe.pdf" });
    return true;
  } catch {
    return false;
  }
}
