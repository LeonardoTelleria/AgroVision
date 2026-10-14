// Prisma's TypeScript client currently emits .ts runtime imports into client.js.
// After tsc, make those imports point to the JavaScript files it just produced.
const fs = require("node:fs");
const path = require("node:path");

const generatedDir = path.resolve(__dirname, "../dist/generated/prisma");
const clientPath = path.join(generatedDir, "client.js");
let client = fs.readFileSync(clientPath, "utf8");

for (const relativePath of ["internal/class", "internal/prismaNamespace", "enums"]) {
  const source = `"./${relativePath}.ts"`;
  const target = `"./${relativePath}.js"`;
  const targetPath = path.join(generatedDir, `${relativePath}.js`);

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing generated Prisma runtime module: ${targetPath}`);
  }
  if (!client.includes(source) && !client.includes(target)) {
    throw new Error(`Expected Prisma runtime import not found: ${source}`);
  }
  client = client.replaceAll(source, target);
}

fs.writeFileSync(clientPath, client);
