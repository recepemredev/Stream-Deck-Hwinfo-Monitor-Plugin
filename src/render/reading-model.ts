import type { Range } from "./graph.js";

/** One reading as a multi-reading surface (composite key, infobar) draws it: text plus its graph. */
export interface ReadingModel {
	label: string;
	value: string;
	unit: string;
	accent: string;
	values: readonly number[];
	range: Range;
	/** True when there is no live data; the value is drawn muted. */
	stale: boolean;
}
