import { copyFile, readFile, writeFile } from "node:fs/promises";

const iconName = "apex-favicon-151.png";
const indexPath = new URL("../dist/index.html", import.meta.url);

await copyFile(
  new URL("../assets/apex-favicon.png", import.meta.url),
  new URL(`../dist/${iconName}`, import.meta.url),
);

const index = await readFile(indexPath, "utf8");
const branded = index.replace(/href=["']\/favicon\.ico["']/, `href="/${iconName}"`);
if (branded === index) throw new Error("Expo favicon link was not found in dist/index.html.");
await writeFile(indexPath, branded);
