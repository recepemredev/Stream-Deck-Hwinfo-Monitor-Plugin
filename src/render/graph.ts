export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Range {
	min: number;
	max: number;
}

export interface Graph {
	line: string;
	area: string;
	last: { x: number; y: number };
}

export interface Bar {
	x: number;
	y: number;
	width: number;
	height: number;
}

const EDGE_INSET = 3;
/** Keeps the latest-value dot from being clipped by the right edge. */
const RIGHT_PAD = 6;
const MIN_SPAN_RATIO = 0.1;
const MIN_SPAN = 1;
const BAR_COUNT = 30;
const BAR_PAD = 6;
const BAR_FILL_RATIO = 0.62;
const MIN_BAR_HEIGHT = 2;

/** Percent readings use a fixed 0-100 scale; everything else fits the data with a minimum span. */
export function resolveRange(values: readonly number[], unit: string): Range {
	if (unit === "%") return { min: 0, max: 100 };
	if (values.length === 0) return { min: 0, max: 1 };
	let min = Math.min(...values);
	let max = Math.max(...values);
	const span = Math.max(Math.abs(max) * MIN_SPAN_RATIO, MIN_SPAN);
	if (max - min < span) {
		const mid = (max + min) / 2;
		min = mid - span / 2;
		max = mid + span / 2;
	}
	return { min, max };
}

/** Fritsch-Carlson tangents: smooth curve that never overshoots the samples. */
function monotoneTangents(ys: number[], step: number): number[] {
	const n = ys.length;
	const slopes = ys.slice(1).map((y, i) => (y - ys[i]) / step);
	const tangents = ys.map((_, i) => {
		if (i === 0) return slopes[0];
		if (i === n - 1) return slopes[n - 2];
		return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
	});
	slopes.forEach((slope, i) => {
		if (slope === 0) {
			tangents[i] = 0;
			tangents[i + 1] = 0;
			return;
		}
		const a = tangents[i] / slope;
		const b = tangents[i + 1] / slope;
		const s = a * a + b * b;
		if (s > 9) {
			const t = 3 / Math.sqrt(s);
			tangents[i] = t * a * slope;
			tangents[i + 1] = t * b * slope;
		}
	});
	return tangents;
}

const fmt = (n: number): string => n.toFixed(1);

/** Maps a value to a y coordinate inside the box (higher value = higher on screen). */
function toY(value: number, box: Box, range: Range): number {
	const height = box.height - EDGE_INSET * 2;
	const ratio = Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min || 1)));
	return box.y + EDGE_INSET + height - ratio * height;
}

/**
 * Builds a smooth line and its filled area. Samples are right-aligned so the graph
 * scrolls left as `capacity` fills up. Returns null when there are fewer than 2 samples.
 */
export function buildGraph(values: readonly number[], capacity: number, box: Box, range: Range): Graph | null {
	if (values.length < 2) return null;
	const right = box.x + box.width - RIGHT_PAD;
	const step = (box.width - RIGHT_PAD) / (capacity - 1);
	const xs = values.map((_, i) => right - (values.length - 1 - i) * step);
	const ys = values.map((v) => toY(v, box, range));
	const tangents = monotoneTangents(ys, step);

	let line = `M${fmt(xs[0])} ${fmt(ys[0])}`;
	for (let i = 0; i < xs.length - 1; i++) {
		const c1x = xs[i] + step / 3;
		const c1y = ys[i] + (tangents[i] * step) / 3;
		const c2x = xs[i + 1] - step / 3;
		const c2y = ys[i + 1] - (tangents[i + 1] * step) / 3;
		line += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(xs[i + 1])} ${fmt(ys[i + 1])}`;
	}
	const bottom = box.y + box.height;
	const last = { x: xs[xs.length - 1], y: ys[ys.length - 1] };
	const area = `${line} L${fmt(last.x)} ${fmt(bottom)} L${fmt(xs[0])} ${fmt(bottom)} Z`;
	return { line, area, last };
}

/** Vertical bars for the most recent samples, standing on the bottom edge of the box. */
export function buildBars(values: readonly number[], box: Box, range: Range): Bar[] {
	const recent = values.slice(-BAR_COUNT);
	const slot = (box.width - BAR_PAD * 2) / BAR_COUNT;
	const width = slot * BAR_FILL_RATIO;
	const bottom = box.y + box.height;
	return recent.map((value, i) => {
		const y = toY(value, box, range);
		return {
			x: box.x + box.width - BAR_PAD - (recent.length - i) * slot + (slot - width) / 2,
			y,
			width,
			height: Math.max(MIN_BAR_HEIGHT, bottom - y),
		};
	});
}
