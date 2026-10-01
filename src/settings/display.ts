import type { JsonObject } from "@elgato/utils";
import type { UnitsSetting } from "../metrics/units.js";
import type { DecimalsSetting } from "../render/format.js";
import type { GraphStyle } from "../render/plot.js";
import type { DisplayMode } from "../render/tile.js";
import { DEFAULT_FONT } from "../render/theme.js";
import {
	parseDecimals,
	parseFont,
	parseGaugeMax,
	parseHexColor,
	parseInterval,
	parseSmoothing,
	parseText,
	parseUnits,
	pick,
} from "./fields.js";

/** How a single-value key looks and samples; shared by Sensor Reading and Derived Metric. */
export type DisplaySettings = {
	mode: DisplayMode;
	graphStyle: GraphStyle;
	label: string;
	decimals: DecimalsSetting;
	/** Show memory sizes in GB instead of HWiNFO's MB. */
	units: UnitsSetting;
	/** Value at which the ring in "donut" mode is full. */
	gaugeMax: number;
	/** EMA smoothing strength in percent (0 = off). */
	smoothing: number;
	/** Sampling interval in ms (0 = every poll). */
	intervalMs: number;
	/** Custom accent as #rrggbb, or "" to derive it from the reading type. */
	color: string;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
};

export const DEFAULT_DISPLAY: DisplaySettings = {
	mode: "both",
	graphStyle: "smooth",
	label: "",
	decimals: "auto",
	units: "native",
	gaugeMax: 100,
	smoothing: 0,
	intervalMs: 0,
	color: "",
	font: DEFAULT_FONT,
	background: "",
};

const MODES: readonly DisplayMode[] = ["both", "text", "graph", "donut"];
const GRAPH_STYLES: readonly GraphStyle[] = ["smooth", "bars"];

/** Validates untrusted Property Inspector input; anything invalid falls back to a default. */
export function normalizeDisplaySettings(raw: JsonObject): DisplaySettings {
	return {
		mode: pick(raw.mode, MODES, DEFAULT_DISPLAY.mode),
		graphStyle: pick(raw.graphStyle, GRAPH_STYLES, DEFAULT_DISPLAY.graphStyle),
		label: parseText(raw.label),
		decimals: parseDecimals(raw.decimals),
		units: parseUnits(raw.units),
		gaugeMax: parseGaugeMax(raw.gaugeMax),
		smoothing: parseSmoothing(raw.smoothing),
		intervalMs: parseInterval(raw.intervalMs),
		color: parseHexColor(raw.color),
		font: parseFont(raw.font),
		background: parseHexColor(raw.background),
	};
}
