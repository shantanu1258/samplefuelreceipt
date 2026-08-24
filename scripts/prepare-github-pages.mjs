import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "out");
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isUserSite = repositoryName.endsWith(".github.io");
const basePath = repositoryName && !isUserSite ? `/${repositoryName}` : "";
const publicFonts = [
  "press-start-2p-latin.woff2",
  "nunito-sans-latin.woff2",
  "vt323-latin.woff2",
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(target) : [target];
    }),
  );
  return nestedFiles.flat();
}

await access(path.join(outputDirectory, "index.html"));

if (basePath) {
  const cssFiles = (await collectFiles(outputDirectory)).filter((file) => file.endsWith(".css"));

  for (const cssFile of cssFiles) {
    const original = await readFile(cssFile, "utf8");
    let updated = original;

    for (const font of publicFonts) {
      updated = updated
        .replaceAll(`url(/${font})`, `url(${basePath}/${font})`)
        .replaceAll(`url("/${font}")`, `url("${basePath}/${font}")`)
        .replaceAll(`url('/${font}')`, `url('${basePath}/${font}')`);
    }

    if (updated !== original) await writeFile(cssFile, updated);
  }

  const remainingRootFontReferences = await Promise.all(
    cssFiles.map(async (cssFile) => {
      const css = await readFile(cssFile, "utf8");
      return publicFonts.some((font) => css.includes(`/${font}`) && !css.includes(`${basePath}/${font}`));
    }),
  );

  if (remainingRootFontReferences.some(Boolean)) {
    throw new Error("GitHub Pages font paths were not prepared correctly.");
  }
}

await writeFile(path.join(outputDirectory, ".nojekyll"), "");
