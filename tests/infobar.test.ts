import assert from "node:assert/strict";
import { test } from "node:test";
import { InfobarTile } from "../src/actions/infobar.js";
import { ReadingType, type Reading, type Snapshot } from "../src/hwinfo/types.js";
import { backgroundDef } from "../src/render/svg.js";

const reading = (key: string, value: number, label = `R${key}`): Reading => ({
	key, type: ReadingType.Temperature, sensorName: "CPU", label, unit: "°C", value, min: 0, max: 0, avg: 0,
});
const snapshot = (...readings: Reading[]): Snapshot => ({ pollTime: 0, readings });

function harness(raw: Record<string, unknown>) {
	const feedback: string[] = [];
	const layouts: string[] = [];
	const bar = {
		setFeedbackLayout: async (path: string) => void layouts.push(path),
		setFeedback: async (payload: Record<string, string>) => void feedback.push(decodeURIComponent(payload.canvas)),
	};
	const tile = new InfobarTile(bar as never, raw as never);
	const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
	return { tile, feedback, layouts, settle, last: () => feedback[feedback.length - 1] };
}

test("infobar sets its layout once and draws through setFeedback", async () => {
	const h = harness({ readingCount: 1, readingKeys: ["1:0:1"], decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 56)));
	await h.settle();
	assert.deepEqual(h.layouts, ["layouts/infobar.json"]);
	assert.match(h.last(), />56</);
	assert.match(h.last(), />R1:0:1</);
});

test("infobar without readings asks for sensors", async () => {
	const h = harness({});
	h.tile.refresh(null);
	await h.settle();
	assert.match(h.last(), />Select sensors</);
});

test("carousel advances to the next reading after the page time", async () => {
	const h = harness({ readingCount: 2, readingKeys: ["1:0:1", "1:0:2"], cycleMs: 3000, decimals: "0" });
	const snap = snapshot(reading("1:0:1", 10), reading("1:0:2", 20));
	h.tile.refresh(snap);
	await h.settle();
	assert.match(h.last(), />R1:0:1</);
	const realNow = Date.now;
	Date.now = () => realNow() + 3500;
	try {
		h.tile.onSnapshot(snap);
		await h.settle();
	} finally {
		Date.now = realNow;
	}
	assert.match(h.last(), />R1:0:2</);
	assert.match(h.last(), />20</);
});

test("overview shows three readings per page", async () => {
	const keys = ["1:0:1", "1:0:2", "1:0:3", "1:0:4"];
	const h = harness({ style: "overview", readingCount: 4, readingKeys: keys, decimals: "0" });
	h.tile.refresh(snapshot(...keys.map((k, i) => reading(k, i + 1))));
	await h.settle();
	assert.ok(h.last().includes(">R1:0:1<") && h.last().includes(">R1:0:3<"));
	assert.ok(!h.last().includes(">R1:0:4<"));
});

test("custom labels replace sensor names and follow their position", async () => {
	const h = harness({
		style: "overview",
		readingCount: 3,
		readingKeys: ["1:0:1", "", "1:0:2"],
		readingLabels: ["CPU", "ignored", ""],
		decimals: "0",
	});
	h.tile.refresh(snapshot(reading("1:0:1", 10), reading("1:0:2", 20)));
	await h.settle();
	assert.ok(h.last().includes(">CPU<")); // custom name
	assert.ok(h.last().includes(">R1:0:2<")); // no custom name: the sensor's own label
	assert.ok(!h.last().includes("ignored")); // label of an unset slot is not shown
});

test("infobar shows memory in GB when asked", async () => {
	const h = harness({ readingCount: 1, readingKeys: ["1:0:1"], units: "gb", decimals: "1" });
	h.tile.refresh(snapshot({ ...reading("1:0:1", 12288), unit: "MB" }));
	await h.settle();
	assert.match(h.last(), />12\.0</);
	assert.match(h.last(), />GB</);
});

test("infobar draws with the chosen background", async () => {
	const h = harness({ readingCount: 1, readingKeys: ["1:0:1"], background: "#204080" });
	h.tile.refresh(snapshot(reading("1:0:1", 50)));
	await h.settle();
	const stops = [...backgroundDef("#204080").matchAll(/stop-color="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
	assert.ok(stops.every((color) => h.last().includes(color)));
});
