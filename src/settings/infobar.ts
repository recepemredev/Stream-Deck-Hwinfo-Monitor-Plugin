import type { JsonObject } from "@elgato/utils";
import type { UnitsSetting } from "../metrics/units.js";
import type { DecimalsSetting } from "../render/format.js";
import type { InfobarStyle } from "../render/infobar.js";
import { parseCount, parseDecimals, parseFont, parseHexColor, parseReadingKeys, parseTexts, parseUnits, pick } from "./fields.js";

export const MIN_INFOBAR_READINGS = 1;
export const MAX_INFOBAR_READINGS = 8;

export type InfobarSettings = {
	style: InfobarStyle;
	/** How many of `readingKeys` are used (1-8). `readingKeys` always holds MAX_INFOBAR_READINGS entries ("" = unset). */
	readingCount: number;
	readingKeys: string[];
	/** Custom name per reading, same positions as `readingKeys` ("" = use the sensor's own label). */
	readingLabels: string[];
	/** Time each page stays on screen, in ms. */
	cycleMs: number;
	decimals: DecimalsSetting;
	units: UnitsSetting;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
};

const STYLES: readonly InfobarStyle[] = ["single", "overview"];
const CYCLE_INTERVALS: readonly number[] = [3000, 5000, 10000, 15000];
const DEFAULT_CYCLE_MS = 5000;

/** Validates untrusted Property Inspector input; anything invalid falls back to a default. */
export function normalizeInfobarSettings(raw: JsonObject): InfobarSettings {
	return {
		style: pick(raw.style, STYLES, "single"),
		readingCount: parseCount(raw.readingCount, MIN_INFOBAR_READINGS, MAX_INFOBAR_READINGS),
		readingKeys: parseReadingKeys(raw.readingKeys, MAX_INFOBAR_READINGS),
		readingLabels: parseTexts(raw.readingLabels, MAX_INFOBAR_READINGS),
		cycleMs: pick(Number(raw.cycleMs), CYCLE_INTERVALS, DEFAULT_CYCLE_MS),
		decimals: parseDecimals(raw.decimals),
		units: parseUnits(raw.units),
		font: parseFont(raw.font),
		background: parseHexColor(raw.background),
	};
}
