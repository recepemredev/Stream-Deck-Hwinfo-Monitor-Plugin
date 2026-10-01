import { truncate } from "./format.js";
import { gradientDef, plotSeries } from "./plot.js";
import type { ReadingModel } from "./reading-model.js";
import { escapeXml, svgDocument } from "./svg.js";
import { LABEL, valueOpacity } from "./theme.js";

export type InfobarStyle = "single" | "overview";

export interface InfobarModel {
	style: InfobarStyle;
	/** Readings on the current page: one for "single", up to three side by side for "overview". */
	items: ReadingModel[];
	page: number;
	pageCount: number;
	capacity: number;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
}

export const INFOBAR_WIDTH = 232;
export const INFOBAR_HEIGHT = 50;

const SEPARATOR = "#ffffff";
const DOT_INACTIVE = "#ffffff";
const SEPARATOR_OPACITY = 0.3;
const ALTERNATE_TINT_OPACITY = 0.05;
/** Column graphs sit behind the value text, so they are softened. */
const COLUMN_GRAPH_OPACITY = 0.55;

function valueSize(length: number, sizes: [number, number, number]): number {
	if (length <= 4) return sizes[0];
	return length <= 6 ? sizes[1] : sizes[2];
}

function renderValue(item: ReadingModel, x: number, y: number, sizes: [number, number, number], unitSize: number): string {
	const unit = item.unit
		? `<tspan font-size="${unitSize}" font-weight="700" fill="${item.accent}" dx="3">${escapeXml(item.unit)}</tspan>`
		: "";
	return `<text x="${x}" y="${y}" fill="#ffffff" fill-opacity="${valueOpacity(item.stale)}" font-size="${valueSize(item.value.length, sizes)}" font-weight="700">${escapeXml(item.value)}${unit}</text>`;
}

/** Long labels shrink instead of being cut off; short ones stay large. */
function singleLabelSize(length: number): number {
	if (length <= 10) return 16;
	return length <= 13 ? 14 : 12;
}

function renderSingle(item: ReadingModel, capacity: number): string {
	const graph = plotSeries(item.values, capacity, { x: 118, y: 4, width: 100, height: 46 }, item.range, {
		style: "smooth",
		accent: item.accent,
		gradientId: "col0",
		lineWidth: 2,
		markerRadius: 2.5,
	});
	return `<rect width="3" height="${INFOBAR_HEIGHT}" fill="${item.accent}"/>`
		+ graph
		+ `<text x="12" y="20" fill="${LABEL}" font-size="${singleLabelSize(item.label.length)}" font-weight="700">${escapeXml(truncate(item.label, 16))}</text>`
		+ renderValue(item, 12, 43, [26, 22, 18], 13);
}

/** Label length that fits a column, by how many columns share the bar. */
function labelMax(columns: number): number {
	return columns === 1 ? 24 : columns === 2 ? 13 : 10;
}

function columnLabelSize(columns: number, length: number): number {
	if (columns === 1) return 14;
	if (columns === 2) return 13;
	return length <= 8 ? 12 : 11;
}

function renderColumn(item: ReadingModel, index: number, columns: number, capacity: number): string {
	const width = INFOBAR_WIDTH / columns;
	const x = index * width;
	const graph = plotSeries(item.values, capacity, { x, y: 20, width, height: 30 }, item.range, {
		style: "smooth",
		accent: item.accent,
		gradientId: `col${index}`,
		lineWidth: 1.5,
		markerRadius: 0,
		opacity: COLUMN_GRAPH_OPACITY,
	});
	const label = truncate(item.label, labelMax(columns));
	// Every other column is tinted and each boundary gets a clear divider, so neighbours never blur together.
	const tint = index % 2 === 1
		? `<rect x="${x}" y="0" width="${width}" height="${INFOBAR_HEIGHT}" fill="${SEPARATOR}" fill-opacity="${ALTERNATE_TINT_OPACITY}"/>`
		: "";
	const separator = index > 0
		? `<rect x="${x - 0.75}" y="5" width="1.5" height="${INFOBAR_HEIGHT - 10}" rx="0.75" fill="${SEPARATOR}" fill-opacity="${SEPARATOR_OPACITY}"/>`
		: "";
	return tint
		+ graph
		+ separator
		+ `<text x="${x + 9}" y="16" fill="${LABEL}" font-size="${columnLabelSize(columns, label.length)}" font-weight="700">${escapeXml(label)}</text>`
		+ renderValue(item, x + 9, 41, columns >= 3 ? [18, 15, 13] : [24, 20, 16], columns >= 3 ? 9 : 11);
}

function renderOverview(items: ReadingModel[], capacity: number): string {
	return items.map((item, i) => renderColumn(item, i, items.length, capacity)).join("");
}

/** Page dots: a vertical column at the right edge for "single", a row at the bottom for "overview". */
function renderPageDots(model: InfobarModel, accent: string): string {
	if (model.pageCount < 2) return "";
	const spacing = Math.min(8, 40 / (model.pageCount - 1));
	const vertical = model.style === "single";
	return Array.from({ length: model.pageCount }, (_, i) => {
		const offset = (i - (model.pageCount - 1) / 2) * spacing;
		const cx = vertical ? INFOBAR_WIDTH - 7 : INFOBAR_WIDTH / 2 + offset;
		const cy = vertical ? INFOBAR_HEIGHT / 2 + offset : INFOBAR_HEIGHT - 3;
		const active = i === model.page;
		return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${active ? 2.2 : 1.6}" fill="${active ? accent : DOT_INACTIVE}" fill-opacity="${active ? 1 : 0.3}"/>`;
	}).join("");
}

/** Renders the Neo infobar (232x50) as SVG. */
export function renderInfobar(model: InfobarModel): string {
	const gradients = model.items.map((item, i) => gradientDef(`col${i}`, item.accent, model.style === "single" ? 0.38 : 0.25)).join("");
	const body = model.style === "single" ? renderSingle(model.items[0], model.capacity) : renderOverview(model.items, model.capacity);
	return svgDocument(
		{ width: INFOBAR_WIDTH, height: INFOBAR_HEIGHT, font: model.font, background: model.background, defs: gradients },
		body + renderPageDots(model, model.items[0].accent),
	);
}
