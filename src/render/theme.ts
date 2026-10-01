import { ReadingType } from "../hwinfo/types.js";

const ACCENTS: Record<ReadingType, string> = {
	[ReadingType.None]: "#9aa4b2",
	[ReadingType.Temperature]: "#ff8a3d",
	[ReadingType.Voltage]: "#ffd43b",
	[ReadingType.Fan]: "#2dd4bf",
	[ReadingType.Current]: "#f472b6",
	[ReadingType.Power]: "#a78bfa",
	[ReadingType.Clock]: "#38bdf8",
	[ReadingType.Usage]: "#4f8cff",
	[ReadingType.Other]: "#9aa4b2",
};

export function accentFor(type: ReadingType): string {
	return ACCENTS[type];
}

/** Distinct per-slot colors so overlaid graphs stay readable even for readings of the same type. */
export const SLOT_COLORS: readonly string[] = ["#ff8a3d", "#4f8cff", "#2dd4bf", "#a78bfa"];

/** Default font of every surface (Windows 11 system font). */
export const DEFAULT_FONT = "Segoe UI Variable";

/** Secondary text color for captions. */
export const MUTED = "#8b95a5";

/** Sensor and slot labels: brighter than captions so the name reads at a glance. */
export const LABEL = "#d3dae4";

/** Value opacity while there is no live data, so a frozen number is not mistaken for a current one. */
export function valueOpacity(stale: boolean): number {
	return stale ? 0.45 : 1;
}
