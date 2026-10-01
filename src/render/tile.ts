import type { Range } from "./graph.js";
import { gradientDef, plotSeries, type GraphStyle } from "./plot.js";
import { escapeXml, KEY_SIZE, svgDocument } from "./svg.js";
import { LABEL, valueOpacity } from "./theme.js";

export type DisplayMode = "both" | "text" | "graph" | "donut";

export interface TileAlert {
	color: string;
	/** Remaining snooze 0..1 while snoozed, null while the alert is showing. */
	snooze: number | null;
}

export interface TileModel {
	mode: DisplayMode;
	graphStyle: GraphStyle;
	label: string;
	value: string;
	unit: string;
	accent: string;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
	values: readonly number[];
	capacity: number;
	range: Range;
	/** True when there is no live data; the value is drawn muted. */
	stale: boolean;
	/** How full the ring is (0-1) in "donut" mode; null when there is no live data. */
	fraction: number | null;
	alert: TileAlert | null;
}

interface Layout {
	labelY: number;
	valueY: number;
	valueSizes: [number, number, number];
	unitY: number | null;
	graph: { y: number; height: number } | null;
}

const LAYOUTS: Record<DisplayMode, Layout> = {
	both: { labelY: 25, valueY: 66, valueSizes: [40, 34, 28], unitY: null, graph: { y: 82, height: 62 } },
	text: { labelY: 40, valueY: 90, valueSizes: [48, 40, 32], unitY: 122, graph: null },
	graph: { labelY: 25, valueY: 0, valueSizes: [0, 0, 0], unitY: null, graph: { y: 36, height: 108 } },
	donut: { labelY: 25, valueY: 0, valueSizes: [0, 0, 0], unitY: null, graph: null },
};

const RING = { cx: 72, cy: 88, radius: 40, width: 12 };
const RING_TRACK_OPACITY = 0.09;
const DONUT_VALUE_SIZES: Layout["valueSizes"] = [30, 24, 19];

/** Long labels shrink instead of being cut off; short ones stay large. */
function labelFontSize(length: number): number {
	if (length <= 11) return 17;
	return length <= 13 ? 15 : 13;
}

function valueFontSize(length: number, sizes: Layout["valueSizes"]): number {
	if (length <= 3) return sizes[0];
	return length <= 5 ? sizes[1] : sizes[2];
}

/** A ring that fills clockwise from the top, with the value and unit inside it. */
function renderDonut(model: TileModel): string {
	const { cx, cy, radius, width } = RING;
	const circumference = 2 * Math.PI * radius;
	const track = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#ffffff" stroke-opacity="${RING_TRACK_OPACITY}" stroke-width="${width}"/>`;
	const arc = model.fraction !== null && model.fraction > 0
		? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${model.accent}" stroke-width="${width}" stroke-linecap="round" `
			+ `stroke-dasharray="${(model.fraction * circumference).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`
		: "";
	const size = valueFontSize(model.value.length, DONUT_VALUE_SIZES);
	const opacity = valueOpacity(model.stale);
	return track
		+ arc
		+ `<text x="${cx}" y="${cy + 8}" fill="#ffffff" fill-opacity="${opacity}" font-size="${size}" font-weight="700" text-anchor="middle">${escapeXml(model.value)}</text>`
		+ `<text x="${cx}" y="${cy + 26}" fill="${model.accent}" font-size="13" font-weight="700" text-anchor="middle">${escapeXml(model.unit)}</text>`;
}

function renderValue(model: TileModel, layout: Layout): string {
	if (model.mode === "graph") return "";
	if (model.mode === "donut") return renderDonut(model);
	const size = valueFontSize(model.value.length, layout.valueSizes);
	const opacity = valueOpacity(model.stale);
	const inlineUnit = layout.unitY === null && model.unit
		? `<tspan font-size="16" font-weight="700" fill="${model.accent}" dx="4">${escapeXml(model.unit)}</tspan>`
		: "";
	const belowUnit = layout.unitY !== null
		? `<text x="72" y="${layout.unitY}" fill="${model.accent}" font-size="18" font-weight="700" text-anchor="middle">${escapeXml(model.unit)}</text>`
		: "";
	return `<text x="72" y="${layout.valueY}" fill="#ffffff" fill-opacity="${opacity}" font-size="${size}" font-weight="700" text-anchor="middle">${escapeXml(model.value)}${inlineUnit}</text>${belowUnit}`;
}

function renderGraph(model: TileModel, layout: Layout): string {
	if (!layout.graph) return "";
	const box = { x: 0, y: layout.graph.y, width: KEY_SIZE, height: layout.graph.height };
	return plotSeries(model.values, model.capacity, box, model.range, {
		style: model.graphStyle,
		accent: model.accent,
		gradientId: "fill",
		lineWidth: 3,
		markerRadius: 4,
	});
}

function renderAlertTint(alert: TileAlert | null): string {
	if (!alert || alert.snooze !== null) return "";
	return `<rect width="${KEY_SIZE}" height="${KEY_SIZE}" fill="${alert.color}" fill-opacity="0.16"/>`;
}

/** Ring while the alert is showing; a shrinking bar while it is snoozed. */
function renderAlertMark(alert: TileAlert | null): string {
	if (!alert) return "";
	if (alert.snooze === null) {
		return `<rect x="2" y="2" width="${KEY_SIZE - 4}" height="${KEY_SIZE - 4}" rx="14" fill="none" stroke="${alert.color}" stroke-width="4"/>`;
	}
	const width = (KEY_SIZE * alert.snooze).toFixed(1);
	return `<rect y="${KEY_SIZE - 6}" width="${KEY_SIZE}" height="6" fill="${alert.color}" fill-opacity="0.25"/>`
		+ `<rect y="${KEY_SIZE - 6}" width="${width}" height="6" fill="${alert.color}" fill-opacity="0.9"/>`;
}

/** Renders one 144x144 key image as SVG. All text is XML-escaped. */
export function renderTile(model: TileModel): string {
	const layout = LAYOUTS[model.mode];
	const frame = { width: KEY_SIZE, height: KEY_SIZE, font: model.font, background: model.background, defs: gradientDef("fill", model.accent) };
	return svgDocument(
		frame,
		renderAlertTint(model.alert)
			+ renderGraph(model, layout)
			+ `<text x="72" y="${layout.labelY}" fill="${LABEL}" font-size="${labelFontSize(model.label.length)}" font-weight="600" text-anchor="middle">${escapeXml(model.label)}</text>`
			+ renderValue(model, layout)
			+ renderAlertMark(model.alert),
	);
}
