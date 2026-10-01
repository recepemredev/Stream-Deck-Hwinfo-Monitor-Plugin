import type { Reading } from "../hwinfo/types.js";
import type { Series } from "../metrics/series.js";
import { convertUnit, type UnitsSetting } from "../metrics/units.js";
import { formatValue, type DecimalsSetting } from "../render/format.js";
import { resolveRange } from "../render/graph.js";
import type { ReadingModel } from "../render/reading-model.js";

export interface ReadingViewOptions {
	/** Text to show; the caller decides between a custom name, the sensor label and a placeholder. */
	label: string;
	accent: string;
	decimals: DecimalsSetting;
	units: UnitsSetting;
}

/**
 * Builds the text-and-graph model of one tracked reading for multi-reading surfaces (composite key, infobar).
 * `reading` is undefined while it is missing from the snapshot; the last smoothed value is then shown as "--".
 */
export function toReadingModel(reading: Reading | undefined, series: Series | undefined, options: ReadingViewOptions): ReadingModel {
	const values = series?.values ?? [];
	const unit = reading ? convertUnit(reading.value, reading.unit, options.units).unit : "";
	return {
		label: options.label,
		value: reading && series?.value !== undefined ? formatValue(series.value, options.decimals) : "--",
		unit,
		accent: options.accent,
		values,
		range: resolveRange(values, unit),
		stale: !reading,
	};
}
