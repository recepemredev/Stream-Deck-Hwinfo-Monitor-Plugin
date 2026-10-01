import type { JsonObject } from "@elgato/utils";
import type { UnitsSetting } from "../metrics/units.js";
import type { DecimalsSetting } from "../render/format.js";
import { DEFAULT_FONT } from "../render/theme.js";

const DECIMALS: readonly DecimalsSetting[] = ["auto", "0", "1", "2"];
const INTERVALS: readonly number[] = [0, 1000, 2000, 5000, 10000];
const FONTS: readonly string[] = [DEFAULT_FONT, "Segoe UI", "Bahnschrift", "Consolas", "Arial"];
const MAX_SMOOTHING = 90;
const DEFAULT_TEXT_MAX = 24;

export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Sensor key format is sensorId:instance:readingId; anything else means "not selected". */
export function parseReadingKey(value: unknown): string {
	return typeof value === "string" && /^[0-9]+:[0-9]+:[0-9]+$/.test(value) ? value : "";
}

export function parseHexColor(value: unknown, fallback = ""): string {
	return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function parseText(value: unknown, maxLength = DEFAULT_TEXT_MAX): string {
	return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function parseSmoothing(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.min(MAX_SMOOTHING, Math.max(0, Math.round(n))) : 0;
}

export function parseDecimals(value: unknown): DecimalsSetting {
	return pick(value, DECIMALS, "auto");
}

export function parseUnits(value: unknown): UnitsSetting {
	return pick(value, ["native", "gb"] as const, "native");
}

const DEFAULT_GAUGE_MAX = 100;
const GAUGE_MAX_LIMIT = 1_000_000;

/** The value at which a ring is full; must be positive, otherwise 100 (a percent reading). */
export function parseGaugeMax(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.min(GAUGE_MAX_LIMIT, n) : DEFAULT_GAUGE_MAX;
}

export function parseInterval(value: unknown): number {
	return pick(Number(value), INTERVALS, 0);
}

export function parseFont(value: unknown): string {
	return pick(value, FONTS, DEFAULT_FONT);
}

/** Integer count clamped to [min, max]; anything unusable becomes `min`. */
export function parseCount(value: unknown, min: number, max: number): number {
	const n = Math.round(Number(value));
	return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

/** A fixed-size list of reading keys; missing or invalid entries become "" (unset). */
export function parseReadingKeys(value: unknown, size: number): string[] {
	const list = Array.isArray(value) ? value : [];
	return Array.from({ length: size }, (_, i) => parseReadingKey(list[i]));
}

/** The entries that take part: the first `count` slots whose reading key is set. */
export function activeEntries<T>(entries: readonly T[], count: number, keyOf: (entry: T) => string): T[] {
	return entries.slice(0, count).filter((entry) => keyOf(entry) !== "");
}

/** A fixed-size list of short texts; missing or invalid entries become "". */
export function parseTexts(value: unknown, size: number, maxLength = DEFAULT_TEXT_MAX): string[] {
	const list = Array.isArray(value) ? value : [];
	return Array.from({ length: size }, (_, i) => parseText(list[i], maxLength));
}
