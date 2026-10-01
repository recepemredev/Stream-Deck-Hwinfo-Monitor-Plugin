// Copies the one runtime dependency that is not bundled into plugin.js (koffi and its Windows x64 native
// binary) into the plugin folder, so the packaged plugin works on a PC that has no project checkout.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SD_PLUGIN_DIR } from "./plugin-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules");
const target = join(root, SD_PLUGIN_DIR, "node_modules");

/** Source code, import libraries and docs that are useless at runtime. */
const BUILD_ONLY = /\.(cc|hh|c|h|cpp|hpp|inc|S|asm|lib|md)$/;

/** koffi finds its native binary at ../../../@koromix/koffi-<platform> relative to its own files. */
const PACKAGES = [
	{ name: "koffi", skip: ["doc", "vendor"] },
	{ name: "@koromix/koffi-win32-x64", skip: [] },
];

rmSync(target, { recursive: true, force: true });

for (const { name, skip } of PACKAGES) {
	const from = join(source, name);
	if (!existsSync(from)) throw new Error(`Missing ${name}; run "npm install" first.`);
	mkdirSync(dirname(join(target, name)), { recursive: true });
	cpSync(from, join(target, name), {
		recursive: true,
		filter: (path) => !skip.some((dir) => path.startsWith(join(from, dir))) && !BUILD_ONLY.test(path),
	});
	console.log(`staged ${name}`);
}
