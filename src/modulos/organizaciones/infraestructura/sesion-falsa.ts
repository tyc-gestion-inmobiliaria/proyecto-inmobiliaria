/**
 * Un `SesionPuerto` en memoria, para las pruebas. No se usa en la app.
 */
import type { Cuenta, FalloDeAcceso, ResultadoAcceso, SesionPuerto } from "../aplicacion/puertos";
import type { Credenciales } from "../dominio/credenciales";

export class SesionFalsa implements SesionPuerto {
  intentos = 0;
  private cuenta: Cuenta | null = null;
  private readonly avisos = new Set<(c: Cuenta | null) => void>();
  private readonly valida?: Credenciales;
  private readonly falloForzado?: FalloDeAcceso;

  constructor(valida?: Credenciales, falloForzado?: FalloDeAcceso) {
    this.valida = valida;
    this.falloForzado = falloForzado;
  }

  async cuentaActual() {
    return this.cuenta;
  }

  async iniciar({ correo, contrasena }: Credenciales): Promise<ResultadoAcceso> {
    this.intentos += 1;
    if (this.falloForzado) return { ok: false, fallo: this.falloForzado };
    if (!this.valida || correo !== this.valida.correo || contrasena !== this.valida.contrasena) {
      return { ok: false, fallo: "credenciales" };
    }
    const cuenta: Cuenta = { id: "cuenta-de-prueba", correo };
    this.cuenta = cuenta;
    this.avisos.forEach((a) => a(cuenta));
    return { ok: true, cuenta };
  }

  async cerrar() {
    this.cuenta = null;
    this.avisos.forEach((a) => a(null));
  }

  alCambiar(aviso: (c: Cuenta | null) => void) {
    this.avisos.add(aviso);
    return () => {
      this.avisos.delete(aviso);
    };
  }
}
