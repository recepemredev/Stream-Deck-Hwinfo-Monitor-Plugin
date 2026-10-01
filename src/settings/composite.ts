import type { JsonObject } from "@elgato/utils";
import type { UnitsSetting } from "../metrics/units.js";
import type { DecimalsSetting } from "../render/format.js";
import {
	isJsonObject,
	parseDecimals,
	parseFont,
	parseCount,
	parseHexColor,
	parseInterval,
	parseReadingKey,
	parseSmoothing,
	parseText,
	parseUnits,
} from "./fields.js";

export const MIN_SLOTS = 2;
export const MAX_SLOTS = 4;

export type CompositeSlot = {
	readingKey: string;
	label: string;
	/** Custom color as #rrggbb, or "" for the slot's default palette color. */
	color: string;
};

export type CompositeSettings = {
	/** How many of `slots` are shown (2-4). `slots` always holds MAX_SLOTS entries. */
	slotCount: number;
	slots: CompositeSlot[];
	decimals: DecimalsSetting;
	units: UnitsSetting;
	smoothing: number;
	intervalMs: number;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
};

function normalizeSlot(raw: unknown): CompositeSlot {
	const slot = isJsonObject(raw) ? raw : {};
	return { readingKey: parseReadingKey(slot.readingKey), label: parseText(slot.label), color: parseHexColor(slot.color) };
}

/** Validates untrusted Property Inspector input; anything invalid falls back to a default. */
export function normalizeCompositeSettings(raw: JsonObject): CompositeSettings {
	const slots = Array.isArray(raw.slots) ? raw.slots : [];
	return {
		slotCount: parseCount(raw.slotCount, MIN_SLOTS, MAX_SLOTS),
		slots: Array.from({ length: MAX_SLOTS }, (_, i) => normalizeSlot(slots[i])),
		decimals: parseDecimals(raw.decimals),
		units: parseUnits(raw.units),
		smoothing: parseSmoothing(raw.smoothing),
		intervalMs: parseInterval(raw.intervalMs),
		font: parseFont(raw.font),
		background: parseHexColor(raw.background),
	};
}
