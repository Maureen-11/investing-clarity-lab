import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const nextEntry = resolve(projectRoot, "node_modules", "next", "dist", "bin", "next");
const basePathArgument = process.argv.find((argument) => argument.startsWith("--base-path="));
const basePath = basePathArgument?.slice("--base-path=".length) || "";

if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("--base-path must start with / and must not end with /");
}

rmSync(resolve(projectRoot, "out"), { recursive: true, force: true });

const result = spawnSync(process.execPath, [nextEntry, "build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    MAINLAND_EXPORT: "1",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  stdio: "inherit",
  shell: false,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
