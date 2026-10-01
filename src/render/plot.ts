import { buildBars, buildGraph, type Box, type Range } from "./graph.js";

export type GraphStyle = "smooth" | "bars";

export interface PlotOptions {
	style: GraphStyle;
	accent: string;
	/** Id of the gradient from `gradientDef`, used for the area under a smooth line. */
	gradientId: string;
	lineWidth: number;
	/** Radius of the latest-value dot (smooth style only); 0 hides it. */
	markerRadius: number;
	/** Overall opacity 0-1 (default 1); lets a graph sit behind text without fighting it. */
	opacity?: number;
}

const BAR_OPACITY = 0.5;

/** Vertical fade used to fill the area under a line. Must be declared in the SVG <defs>. */
export function gradientDef(id: string, accent: string, opacity = 0.38): string {
	return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">`
		+ `<stop offset="0" stop-color="${accent}" stop-opacity="${opacity}"/>`
		+ `<stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>`;
}

function plotSmooth(values: readonly number[], capacity: number, box: Box, range: Range, o: PlotOptions): string {
	const graph = buildGraph(values, capacity, box, range);
	if (!graph) return "";
	const marker = o.markerRadius > 0
		? `<circle cx="${graph.last.x.toFixed(1)}" cy="${graph.last.y.toFixed(1)}" r="${o.markerRadius}" fill="#ffffff" stroke="${o.accent}" stroke-width="2"/>`
		: "";
	return `<path d="${graph.area}" fill="url(#${o.gradientId})"/>`
		+ `<path d="${graph.line}" fill="none" stroke="${o.accent}" stroke-width="${o.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
		+ marker;
}

function plotBars(values: readonly number[], box: Box, range: Range, o: PlotOptions): string {
	const bars = buildBars(values, box, range);
	return bars
		.map((b, i) => {
			const opacity = i === bars.length - 1 ? 1 : BAR_OPACITY;
			return `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.width.toFixed(1)}" height="${b.height.toFixed(1)}" rx="1.5" fill="${o.accent}" fill-opacity="${opacity}"/>`;
		})
		.join("");
}

/** Draws one series as SVG in the chosen style. Returns "" when there is nothing to draw. */
export function plotSeries(values: readonly number[], capacity: number, box: Box, range: Range, options: PlotOptions): string {
	const plot = options.style === "bars" ? plotBars(values, box, range, options) : plotSmooth(values, capacity, box, range, options);
	return plot && options.opacity !== undefined && options.opacity < 1 ? `<g opacity="${options.opacity}">${plot}</g>` : plot;
}
