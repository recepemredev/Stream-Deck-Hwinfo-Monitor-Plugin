import assert from "node:assert/strict";
import { test } from "node:test";
import { renderComposite } from "../src/render/composite.js";
import { applyTemplate, formatValue, truncate } from "../src/render/format.js";
import { buildBars, buildGraph, resolveRange } from "../src/render/graph.js";
import { ImageSink } from "../src/render/image-sink.js";
import { renderInfobar } from "../src/render/infobar.js";
import type { ReadingModel } from "../src/render/reading-model.js";
import { backgroundDef } from "../src/render/svg.js";
import { renderTile } from "../src/render/tile.js";

const BOX = { x: 0, y: 0, width: 144, height: 60 };

test("graph needs at least two samples", () => {
	assert.equal(buildGraph([5], 60, BOX, { min: 0, max: 10 }), null);
});

test("graph stays inside its box and is right-aligned", () => {
	const graph = buildGraph([0, 10, 0, 10, 5], 60, BOX, { min: 0, max: 10 });
	assert.ok(graph);
	assert.equal(graph.last.x, 138);
	const ys = [...graph.line.matchAll(/[0-9.]+ ([0-9.-]+)/g)].map((m) => Number(m[1]));
	assert.ok(ys.every((y) => y >= 0 && y <= 60));
});

test("percent readings use a fixed scale, flat data gets a minimum span", () => {
	assert.deepEqual(resolveRange([10, 20], "%"), { min: 0, max: 100 });
	const flat = resolveRange([50, 50], "°C");
	assert.ok(flat.max - flat.min >= 5);
});

test("formatting", () => {
	assert.equal(formatValue(56.04, "auto"), "56.0");
	assert.equal(formatValue(4512.3, "auto"), "4512");
	assert.equal(formatValue(3.14159, "auto"), "3.14");
	assert.equal(formatValue(56.6, "0"), "57");
	assert.equal(formatValue(Number.NaN, "auto"), "--");
	assert.equal(truncate("abcdefghij", 5), "abcd…");
});

test("tile escapes text and renders every mode", () => {
	for (const mode of ["both", "text", "graph", "donut"] as const) {
		const svg = renderTile({
			mode, graphStyle: "smooth", label: "<b>&", value: "56", unit: "°C", accent: "#ff8a3d", font: "Segoe UI",
			values: [1, 2, 3], capacity: 60, range: { min: 0, max: 5 }, stale: false, fraction: 0.5, alert: null, background: "",
		});
		assert.ok(!svg.includes("<b>"));
		assert.ok(svg.startsWith("<svg"));
	}
});

test("donut fills clockwise by fraction and skips the arc without data", () => {
	const model = {
		mode: "donut" as const, graphStyle: "smooth" as const, label: "Battery", value: "80", unit: "%", accent: "#34d399", font: "Segoe UI",
		values: [], capacity: 60, range: { min: 0, max: 100 }, stale: false, fraction: 0.25, alert: null, background: "",
	};
	const svg = renderTile(model);
	const circumference = 2 * Math.PI * 40;
	assert.ok(svg.includes(`stroke-dasharray="${(0.25 * circumference).toFixed(1)} ${circumference.toFixed(1)}"`));
	assert.ok(!renderTile({ ...model, fraction: null, stale: true, value: "--" }).includes("stroke-dasharray"));
	assert.ok(!renderTile({ ...model, fraction: 0 }).includes("stroke-dasharray"));
});

test("template placeholders", () => {
	assert.equal(applyTemplate("HOT {value}{unit}", { value: "91", unit: "°C" }), "HOT 91°C");
});

test("bars stay inside the box and keep the newest on the right", () => {
	const box = { x: 0, y: 40, width: 144, height: 100 };
	const bars = buildBars(Array.from({ length: 50 }, (_, i) => i), box, { min: 0, max: 49 });
	assert.equal(bars.length, 30);
	for (const b of bars) {
		assert.ok(b.x >= 0 && b.x + b.width <= 144);
		assert.ok(b.y >= 40 && b.y + b.height <= 140.01);
	}
	assert.ok(bars[29].x > bars[0].x);
	assert.ok(bars[29].height > bars[0].height);
});

const ITEM: ReadingModel = {
	label: "<CPU>", value: "56", unit: "°C", accent: "#ff8a3d", values: [1, 2, 3, 2], range: { min: 0, max: 5 }, stale: false,
};

test("composite renders 2, 3 and 4 slots and escapes text", () => {
	for (const n of [2, 3, 4]) {
		const svg = renderComposite({ slots: Array.from({ length: n }, () => ITEM), capacity: 60, font: "Segoe UI", background: "" });
		assert.ok(svg.startsWith("<svg"));
		assert.ok(!svg.includes("<CPU>"));
		assert.equal(svg.match(/id="slot\d"/g)?.length, n);
	}
});

test("infobar renders single and overview styles for the 232x50 bar and escapes text", () => {
	const single = renderInfobar({ style: "single", items: [ITEM], page: 0, pageCount: 3, capacity: 60, font: "Segoe UI", background: "" });
	assert.ok(single.includes('width="232" height="50"'));
	assert.ok(!single.includes("<CPU>"));
	assert.equal(single.match(/<circle/g)?.length, 3 + 1); // 3 page dots + latest-value marker
	const overview = renderInfobar({ style: "overview", items: [ITEM, ITEM, ITEM], page: 0, pageCount: 1, capacity: 60, font: "Segoe UI", background: "" });
	assert.equal(overview.match(/id="col\d"/g)?.length, 3);
});

const stops = (def: string) => [...def.matchAll(/stop-color="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
const luma = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);

test("default background keeps the original dark gradient", () => {
	assert.deepEqual(stops(backgroundDef()), ["#171d26", "#0b0f14"]);
	assert.deepEqual(stops(backgroundDef("")), ["#171d26", "#0b0f14"]);
});

test("custom background is lightened at the top and darkened at the bottom", () => {
	const [top, bottom] = stops(backgroundDef("#204080"));
	assert.ok(luma(top) > luma("#204080"));
	assert.ok(luma(bottom) < luma("#204080"));
	assert.deepEqual(stops(backgroundDef("#000000")).length, 2);
	assert.equal(stops(backgroundDef("#ffffff"))[0], "#ffffff");
});

test("image sink skips repeated frames until invalidated", () => {
	const sent: string[] = [];
	const sink = new ImageSink((image) => sent.push(image));
	sink.show("<svg>a</svg>");
	sink.show("<svg>a</svg>");
	assert.equal(sent.length, 1);
	sink.show("<svg>b</svg>");
	assert.equal(sent.length, 2);
	sink.invalidate();
	sink.show("<svg>b</svg>");
	assert.equal(sent.length, 3);
	assert.ok(sent[0].startsWith("data:image/svg+xml"));
});
