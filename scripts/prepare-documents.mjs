import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// The source upload exceeds the connector's 16 MiB request limit. Store exact
// binary parts in Git, then restore the static PDF before every build.
const filename = "Water-Guard-Station.pdf";
const expected = "13815bc2b68605862876b9e9ee8b6315372808ec2336c05af8b95a9e80ec1a05";
const output = new URL(`../public/documents/${filename}`, import.meta.url);
const digest = (data) => createHash("sha256").update(data).digest("hex");

let current;
try { current = await readFile(output); }
catch (error) { if (error.code !== "ENOENT") throw error; }

if (!current || digest(current) !== expected) {
  const parts = await Promise.all([1, 2, 3, 4].map((part) =>
    readFile(new URL(`../source-documents/${filename}.part${part}`, import.meta.url))
  ));
  const restored = Buffer.concat(parts);
  if (digest(restored) !== expected) throw new Error("The presentation source parts do not match the original PDF.");
  await mkdir(new URL("../public/documents/", import.meta.url), { recursive: true });
  await writeFile(output, restored);
}
console.log("Presentation PDF verified.");
