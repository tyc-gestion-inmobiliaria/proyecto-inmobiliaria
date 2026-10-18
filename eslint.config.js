// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions corre en Deno y se revisa con `deno check`, no con este lint.
    ignores: ["dist/*", ".expo/*", "supabase/*"],
  },
]);
