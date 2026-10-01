import type { JsonObject } from "@elgato/utils";
import { DEFAULT_DISPLAY, normalizeDisplaySettings, type DisplaySettings } from "./display.js";
import { parseReadingKey } from "./fields.js";

export type SensorReadingSettings = DisplaySettings & {
	readingKey: string;
	/** Whether the global threshold rules apply to this key. */
	alerts: boolean;
};

export const DEFAULT_SETTINGS: SensorReadingSettings = { ...DEFAULT_DISPLAY, readingKey: "", alerts: true };

/** Validates untrusted Property Inspector input; anything invalid falls back to a default. */
export function normalizeSettings(raw: JsonObject): SensorReadingSettings {
	return {
		...normalizeDisplaySettings(raw),
		readingKey: parseReadingKey(raw.readingKey),
		alerts: raw.alerts !== false,
	};
}
