import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { SD_PLUGIN_DIR } from "./scripts/plugin-paths.mjs";

export default {
	input: "src/plugin.ts",
	output: {
		file: `${SD_PLUGIN_DIR}/bin/plugin.js`,
		format: "esm",
		sourcemap: false,
	},
	// koffi ships a native binary, so it is loaded from node_modules at runtime instead of being bundled.
	external: ["koffi"],
	plugins: [
		typescript({ tsconfig: "./tsconfig.json", include: ["src/**/*.ts"], noEmit: false, outDir: `${SD_PLUGIN_DIR}/bin` }),
		nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
		commonjs(),
	],
};
