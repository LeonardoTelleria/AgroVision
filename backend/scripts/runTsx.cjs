const path = require("node:path");

// tsx usa os.userInfo() para nombrar su directorio temporal. En algunos
// entornos Windows administrados esa llamada puede fallar aunque Node funcione.
// Un geteuid estable evita depender de esa consulta y no cambia la ejecución TS.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}

if (require.main === module) {
  const preloadPath = path.resolve(__filename).replaceAll("\\", "/");
  const preloadOption = `--require="${preloadPath}"`;
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, preloadOption].filter(Boolean).join(" ");
  process.argv = [process.execPath, "tsx", ...process.argv.slice(2)];
  import("../node_modules/tsx/dist/cli.mjs");
}
