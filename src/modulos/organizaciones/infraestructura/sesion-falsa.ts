/**
 * Un `SesionPuerto` en memoria, para las pruebas. No se usa en la app.
 */
import type {
  Cuenta,
  FalloDeAcceso,
  FalloDeContrasena,
  FalloDeRecuperacion,
  Resultado,
  ResultadoAcceso,
  SesionPuerto,
} from "../aplicacion/puertos";
import type { Credenciales } from "../dominio/credenciales";

export class SesionFalsa implements SesionPuerto {
  intentos = 0;
  /** Los correos a los que se pidió recuperación, en orden. */
  readonly recuperaciones: string[] = [];
  /** La última contraseña fijada. */
  contrasenaFijada: string | null = null;
  falloDeRecuperacion?: FalloDeRecuperacion;
  falloDeContrasena?: FalloDeContrasena;
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

  async pedirRecuperacion(correo: string): Promise<Resultado<FalloDeRecuperacion>> {
    if (this.falloDeRecuperacion) return { ok: false, fallo: this.falloDeRecuperacion };
    this.recuperaciones.push(correo);
    return { ok: true };
  }

  async abrirRecuperacion(tokenDeAcceso: string): Promise<Resultado<FalloDeContrasena>> {
    if (tokenDeAcceso === "vencido") return { ok: false, fallo: "enlace-vencido" };
    const cuenta: Cuenta = { id: "cuenta-de-prueba", correo: this.valida?.correo ?? "persona@ejemplo.com" };
    this.cuenta = cuenta;
    this.avisos.forEach((a) => a(cuenta));
    return { ok: true };
  }

  async fijarContrasena(nueva: string): Promise<Resultado<FalloDeContrasena>> {
    if (this.falloDeContrasena) return { ok: false, fallo: this.falloDeContrasena };
    if (!this.cuenta) return { ok: false, fallo: "enlace-vencido" };
    this.contrasenaFijada = nueva;
    return { ok: true };
  }

  alCambiar(aviso: (c: Cuenta | null) => void) {
    this.avisos.add(aviso);
    return () => {
      this.avisos.delete(aviso);
    };
  }
}
