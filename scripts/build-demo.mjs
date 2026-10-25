/**
 * La web de demostración: la maqueta (datos ficticios en memoria, sin
 * Supabase) exportada como sitio estático en `dist/`, lista para subir a un
 * hosting gratuito y mandar el enlace a quien la tenga que ver.
 *
 * - Fuerza `EXPO_PUBLIC_DATOS=maqueta` aunque el `.env.local` diga otra cosa:
 *   la demo nunca debe intentar hablar con una base.
 * - Deja `dist/_redirects` para Cloudflare Pages y Netlify: cualquier
 *   dirección (`/buildings/…`) sirve `index.html` y la resuelve el router.
 *   EAS Hosting no lo necesita.
 *
 * Uso: `npm run build:demo`.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const env = { ...process.env, EXPO_PUBLIC_DATOS: "maqueta" };
const r = spawnSync("npx", ["expo", "export", "--platform", "web", "--clear"], { stdio: "inherit", env, shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);

writeFileSync(join("dist", "_redirects"), "/* /index.html 200\n");
console.log("\nDemo lista en dist/ (maqueta, sin servidor). Súbela con: npx eas-cli deploy, o arrastra dist/ a Cloudflare Pages.");
