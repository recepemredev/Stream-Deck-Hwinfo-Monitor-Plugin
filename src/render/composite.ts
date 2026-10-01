import { truncate } from "./format.js";
import { gradientDef, plotSeries } from "./plot.js";
import type { ReadingModel } from "./reading-model.js";
import { escapeXml, KEY_SIZE, svgDocument } from "./svg.js";
import { LABEL, valueOpacity } from "./theme.js";

export interface CompositeModel {
	slots: ReadingModel[];
	capacity: number;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
}

const TOP = 8;
const GRAPH_GAP = 6;

interface RowLayout {
	height: number;
	labelSize: number;
	valueSize: number;
	labelMax: number;
}

/** Fewer slots get roomier rows; the graph band takes whatever height is left. */
const ROWS: Record<number, RowLayout> = {
	2: { height: 32, labelSize: 14, valueSize: 20, labelMax: 9 },
	3: { height: 26, labelSize: 13, valueSize: 18, labelMax: 9 },
	4: { height: 21, labelSize: 12, valueSize: 15, labelMax: 8 },
};

function renderRow(slot: ReadingModel, index: number, row: RowLayout): string {
	const top = TOP + index * row.height;
	const baseline = top + row.height * 0.72;
	const opacity = valueOpacity(slot.stale);
	const unit = slot.unit
		? `<tspan font-size="${Math.round(row.valueSize * 0.55)}" font-weight="700" fill="${slot.accent}" dx="2">${escapeXml(slot.unit)}</tspan>`
		: "";
	return `<circle cx="12" cy="${top + row.height / 2}" r="4" fill="${slot.accent}"/>`
		+ `<text x="22" y="${baseline}" fill="${LABEL}" font-size="${row.labelSize}" font-weight="600">${escapeXml(truncate(slot.label, row.labelMax))}</text>`
		+ `<text x="136" y="${baseline}" fill="#ffffff" fill-opacity="${opacity}" font-size="${row.valueSize}" font-weight="700" text-anchor="end">${escapeXml(slot.value)}${unit}</text>`;
}

function renderGraphs(model: CompositeModel, graphTop: number): string {
	const box = { x: 0, y: graphTop, width: KEY_SIZE, height: KEY_SIZE - graphTop };
	return model.slots
		.map((slot, i) =>
			plotSeries(slot.values, model.capacity, box, slot.range, {
				style: "smooth",
				accent: slot.accent,
				gradientId: `slot${i}`,
				lineWidth: 2.5,
				markerRadius: 3,
			}),
		)
		.join("");
}

/** Renders a 144x144 key with 2-4 readings: value rows on top, all graphs overlaid below. */
export function renderComposite(model: CompositeModel): string {
	const row = ROWS[model.slots.length];
	const graphTop = TOP + model.slots.length * row.height + GRAPH_GAP;
	const gradients = model.slots.map((slot, i) => gradientDef(`slot${i}`, slot.accent, 0.22)).join("");
	return svgDocument(
		{ width: KEY_SIZE, height: KEY_SIZE, font: model.font, background: model.background, defs: gradients },
		renderGraphs(model, graphTop) + model.slots.map((slot, i) => renderRow(slot, i, row)).join(""),
	);
}
