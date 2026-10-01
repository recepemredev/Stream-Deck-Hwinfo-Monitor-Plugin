import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSensorConfig } from "../src/actions/sensor-reading.js";
import { ValueTile } from "../src/actions/value-tile.js";
import type { ThresholdRule } from "../src/alerts/threshold.js";
import { ReadingType, type Reading, type Snapshot } from "../src/hwinfo/types.js";
import { backgroundDef } from "../src/render/svg.js";

const reading = (key: string, value: number, extra: Partial<Reading> = {}): Reading => ({
	key, type: ReadingType.Temperature, sensorName: "CPU", label: `R${key}`, unit: "°C", value, min: 0, max: 0, avg: 0, ...extra,
});
const snapshot = (...readings: Reading[]): Snapshot => ({ pollTime: 0, readings });

const RULE: ThresholdRule = {
	id: "r", readingType: ReadingType.Temperature, comparison: "above", value: 80, hysteresis: 2,
	dwellMs: 0, cooldownMs: 0, sticky: false, snoozeMs: 60000, color: "#ff4d4f", text: "HOT {value}{unit}",
};

function harness(parse: typeof parseSensorConfig, raw: Record<string, unknown>, thresholds: ThresholdRule[] = []) {
	const images: string[] = [];
	const key = { setImage: (image: string) => void images.push(decodeURIComponent(image)) };
	const globals = { current: { pollMs: 1000, thresholds } };
	const tile = new ValueTile(key as never, raw as never, parse, globals as never);
	return { tile, images, last: () => images[images.length - 1] };
}

test("sensor tile shows the reading value, unit and label", () => {
	const h = harness(parseSensorConfig, { readingKey: "1:0:1", decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 56.4)));
	assert.match(h.last(), />56</);
	assert.match(h.last(), />°C</);
	assert.match(h.last(), />R1:0:1</);
});

test("sensor tile without selection or data", () => {
	const h = harness(parseSensorConfig, {});
	h.tile.refresh(null);
	assert.match(h.last(), />Select sensor</);
	assert.match(h.last(), />--</);
});

test("alerts: activate, then snooze on press", () => {
	const h = harness(parseSensorConfig, { readingKey: "1:0:1", decimals: "0" }, [RULE]);
	h.tile.refresh(snapshot(reading("1:0:1", 90)));
	assert.match(h.last(), />HOT 90°C</); // alert text replaces the label
	assert.match(h.last(), /stroke="#ff4d4f" stroke-width="4"/);
	h.tile.onPress(snapshot(reading("1:0:1", 90)));
	assert.doesNotMatch(h.last(), />HOT/); // snoozed: normal label, countdown bar
	assert.match(h.last(), /height="6"/);
});

test("changing the tracked reading resets history", () => {
	const h = harness(parseSensorConfig, { readingKey: "1:0:1", decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 50), reading("1:0:2", 70)));
	h.tile.applySettings({ readingKey: "1:0:2", decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 50), reading("1:0:2", 70)));
	assert.match(h.last(), />70</);
});

test("donut ring fills relative to the ring max and clamps", () => {
	const dash = (svg: string) => Number(svg.match(/stroke-dasharray="([0-9.]+) /)?.[1]);
	const circumference = 2 * Math.PI * 40;
	const half = harness(parseSensorConfig, { readingKey: "1:0:1", mode: "donut" });
	half.tile.refresh(snapshot(reading("1:0:1", 50, { unit: "%" })));
	assert.ok(Math.abs(dash(half.last()) - circumference / 2) < 0.1);
	const scaled = harness(parseSensorConfig, { readingKey: "1:0:1", mode: "donut", gaugeMax: 200 });
	scaled.tile.refresh(snapshot(reading("1:0:1", 50, { unit: "GB" })));
	assert.ok(Math.abs(dash(scaled.last()) - circumference / 4) < 0.1);
	const over = harness(parseSensorConfig, { readingKey: "1:0:1", mode: "donut" });
	over.tile.refresh(snapshot(reading("1:0:1", 500, { unit: "%" })));
	assert.ok(Math.abs(dash(over.last()) - circumference) < 0.1);
});

test("sensor tile shows memory in GB when asked", () => {
	const gb = harness(parseSensorConfig, { readingKey: "1:0:1", units: "gb", decimals: "1" });
	gb.tile.refresh(snapshot(reading("1:0:1", 8704, { unit: "MB" })));
	assert.match(gb.last(), />8\.5</);
	assert.match(gb.last(), />GB</);
	const native = harness(parseSensorConfig, { readingKey: "1:0:1", decimals: "0" });
	native.tile.refresh(snapshot(reading("1:0:1", 8704, { unit: "MB" })));
	assert.match(native.last(), />8704</);
	assert.match(native.last(), />MB</);
});

test("sensor tile draws with the chosen background", () => {
	const h = harness(parseSensorConfig, { readingKey: "1:0:1", background: "#204080" });
	h.tile.refresh(snapshot(reading("1:0:1", 50)));
	const stops = [...backgroundDef("#204080").matchAll(/stop-color="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
	assert.ok(stops.every((color) => h.last().includes(color)));
	assert.ok(!h.last().includes("#171d26"));
});
