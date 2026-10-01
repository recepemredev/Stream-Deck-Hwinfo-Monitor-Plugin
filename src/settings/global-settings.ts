import type { JsonObject } from "@elgato/utils";
import type { ThresholdRule } from "../alerts/threshold.js";
import { ReadingType } from "../hwinfo/types.js";
import { isJsonObject, parseHexColor, parseText } from "./fields.js";

export type GlobalSettings = {
	pollMs: number;
	thresholds: ThresholdRule[];
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = { pollMs: 1000, thresholds: [] };

const POLL_RATES: readonly number[] = [250, 500, 1000, 2000, 5000, 10000];
const SNOOZES: readonly number[] = [0, 300000, 900000, 3600000];
const MAX_RULES = 20;
const MAX_TEXT = 24;
const MAX_MS = 3600000;
const DEFAULT_ALERT_COLOR = "#ff4d4f";
/** Rules target a concrete reading type; "None" (0) never matches a reading. */
const READING_TYPES = Object.values(ReadingType).filter((type): type is ReadingType => typeof type === "number" && type !== ReadingType.None);

function finite(value: unknown, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function clampMs(value: unknown): number {
	return Math.min(MAX_MS, Math.max(0, Math.round(finite(value, 0))));
}

/** Returns null when the entry is unusable (no valid id or type), so it is dropped. */
function normalizeRule(raw: unknown): ThresholdRule | null {
	if (!isJsonObject(raw)) return null;
	const id = typeof raw.id === "string" && /^[A-Za-z0-9-]{1,40}$/.test(raw.id) ? raw.id : null;
	const readingType = Number(raw.readingType);
	if (!id || !READING_TYPES.includes(readingType)) return null;
	return {
		id,
		readingType,
		comparison: raw.comparison === "below" ? "below" : "above",
		value: finite(raw.value, 0),
		hysteresis: Math.max(0, finite(raw.hysteresis, 0)),
		dwellMs: clampMs(raw.dwellMs),
		cooldownMs: clampMs(raw.cooldownMs),
		sticky: raw.sticky === true,
		snoozeMs: SNOOZES.includes(Number(raw.snoozeMs)) ? Number(raw.snoozeMs) : SNOOZES[1],
		color: parseHexColor(raw.color, DEFAULT_ALERT_COLOR),
		text: parseText(raw.text, MAX_TEXT),
	};
}

/** Validates untrusted global settings written by the Property Inspector. */
export function normalizeGlobalSettings(raw: JsonObject): GlobalSettings {
	const pollMs = Number(raw.pollMs);
	const rules = Array.isArray(raw.thresholds) ? raw.thresholds.slice(0, MAX_RULES) : [];
	return {
		pollMs: POLL_RATES.includes(pollMs) ? pollMs : DEFAULT_GLOBAL_SETTINGS.pollMs,
		thresholds: rules.map(normalizeRule).filter((rule): rule is ThresholdRule => rule !== null),
	};
}
