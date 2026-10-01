import type { JsonObject } from "@elgato/utils";
import { DERIVED_OPERATIONS, type DerivedOperation } from "../metrics/derived.js";
import { normalizeDisplaySettings, type DisplaySettings } from "./display.js";
import { parseCount, parseReadingKeys, pick } from "./fields.js";

export const MIN_READINGS = 2;
export const MAX_READINGS = 8;

export type DerivedSettings = DisplaySettings & {
	operation: DerivedOperation;
	/** How many of `readingKeys` are used (2-8). `readingKeys` always holds MAX_READINGS entries ("" = unset). */
	readingCount: number;
	readingKeys: string[];
};

/** Validates untrusted Property Inspector input; anything invalid falls back to a default. */
export function normalizeDerivedSettings(raw: JsonObject): DerivedSettings {
	return {
		...normalizeDisplaySettings(raw),
		operation: pick(raw.operation, DERIVED_OPERATIONS, "sum"),
		readingCount: parseCount(raw.readingCount, MIN_READINGS, MAX_READINGS),
		readingKeys: parseReadingKeys(raw.readingKeys, MAX_READINGS),
	};
}
