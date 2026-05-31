import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

type PackageMetadata = {
  name: string;
  version: string;
};

export function getPackageMetadata(): PackageMetadata {
  const candidates = [
    fileURLToPath(new URL("../package.json", import.meta.url)),
    join(process.cwd(), "package.json"),
    join(process.cwd(), "apps", "api", "package.json")
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, "utf8")) as PackageMetadata;
      return {
        name: parsed.name,
        version: parsed.version
      };
    } catch {
      // Try the next likely project layout.
    }
  }

  return {
    name: "@pushnot/api",
    version: "0.1.0"
  };
}
