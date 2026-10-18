/**
 * Falla si una clave de servicio de Supabase quedó en el repositorio o al
 * alcance del cliente (PB-03). Lo corre el CI en cada push.
 *
 * Busca claves, no la palabra: `service_role` aparece con razón en las
 * migraciones y en la configuración local. Lo que no puede aparecer es:
 *
 * - una clave secreta nueva (`sb_secret_…`);
 * - un JWT cuyo rol sea `service_role` (las claves viejas);
 * - una variable `EXPO_PUBLIC_*` con SERVICE o SECRET en el nombre: todo lo
 *   que empieza así se hornea en el cliente;
 * - el código de la app (`src/`) nombrando `service_role`.
 *
 * Revisa solo lo versionado (`git ls-files`), así `.env.local` no cuenta.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const archivos = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((f) => f && !f.endsWith("package-lock.json") && !/\.(png|jpe?g|gif|ico|ttf|otf|woff2?)$/i.test(f));

const SECRETA = /sb_secret_[A-Za-z0-9_-]{10,}/;
const JWT = /eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g;
const VARIABLE_PUBLICA = /EXPO_PUBLIC_\w*(SERVICE|SECRET)\w*/i;

function rolDelJwt(cuerpo) {
  try {
    return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")).role;
  } catch {
    return undefined;
  }
}

const hallazgos = [];
for (const archivo of archivos) {
  if (archivo === "scripts/revisar-claves.mjs") continue;
  let texto;
  try {
    texto = readFileSync(archivo, "utf8");
  } catch {
    continue;
  }
  texto.split(/\r?\n/).forEach((linea, i) => {
    const donde = `${archivo}:${i + 1}`;
    if (SECRETA.test(linea)) hallazgos.push(`${donde}: clave secreta (sb_secret_…)`);
    for (const m of linea.matchAll(JWT)) {
      if (rolDelJwt(m[1]) === "service_role") hallazgos.push(`${donde}: JWT con rol service_role`);
    }
    if (VARIABLE_PUBLICA.test(linea)) hallazgos.push(`${donde}: variable EXPO_PUBLIC_ con nombre de clave privada`);
    if (archivo.startsWith("src/") && /service_role/.test(linea)) hallazgos.push(`${donde}: el cliente nombra service_role`);
  });
}

if (hallazgos.length > 0) {
  console.error("Claves de servicio fuera de su sitio:\n" + hallazgos.map((h) => `  ${h}`).join("\n"));
  console.error("\nLa clave de servicio va en los secretos de GitHub y de las Edge Functions, nunca en el repositorio.");
  process.exit(1);
}
console.log(`Sin claves de servicio en ${archivos.length} archivos versionados.`);
