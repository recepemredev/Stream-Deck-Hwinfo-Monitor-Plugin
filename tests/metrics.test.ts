import assert from "node:assert/strict";
import { test } from "node:test";
import { computeDerived, isPairOperation } from "../src/metrics/derived.js";
import { IntervalGate } from "../src/metrics/interval-gate.js";
import { HISTORY_CAPACITY, Series } from "../src/metrics/series.js";
import { ema } from "../src/metrics/smoothing.js";
import { convertUnit } from "../src/metrics/units.js";

test("ema starts at the first sample and moves by alpha", () => {
	assert.equal(ema(undefined, 10, 0.5), 10);
	assert.equal(ema(10, 20, 0.5), 15);
	assert.equal(ema(10, 20, 1), 20);
});

test("series smooths and resets", () => {
	const series = new Series(3);
	assert.equal(series.push(10, 0), 10);
	assert.equal(series.push(20, 50), 15);
	series.push(1, 0);
	series.push(2, 0);
	assert.equal(series.values.length, 3);
	series.reset();
	assert.equal(series.value, undefined);
	assert.deepEqual(series.values, []);
	assert.equal(new Series().capacity, HISTORY_CAPACITY);
});

test("interval gate lets one sample through per interval", () => {
	const t = 1_700_000_000_000;
	const gate = new IntervalGate();
	assert.equal(gate.take(1000, t), true);
	assert.equal(gate.take(1000, t + 500), false);
	assert.equal(gate.take(1000, t + 950), true); // within jitter slack
	gate.reset();
	assert.equal(gate.take(60000, t + 960), true);
	assert.equal(new IntervalGate().take(0, t), true);
});

test("MB converts to GB only when asked, other units are untouched", () => {
	assert.deepEqual(convertUnit(8192, "MB", "gb"), { value: 8, unit: "GB" });
	assert.deepEqual(convertUnit(2048, "MB/s", "gb"), { value: 2, unit: "GB/s" });
	assert.deepEqual(convertUnit(8192, "MB", "native"), { value: 8192, unit: "MB" });
	assert.deepEqual(convertUnit(56, "°C", "gb"), { value: 56, unit: "°C" });
	assert.deepEqual(convertUnit(8, "GB", "gb"), { value: 8, unit: "GB" });
});

test("derived operations over several readings", () => {
	const v = [10, 20, 60];
	assert.equal(computeDerived("sum", v), 90);
	assert.equal(computeDerived("avg", v), 30);
	assert.equal(computeDerived("max", v), 60);
	assert.equal(computeDerived("min", v), 10);
});

test("delta and percent compare the first two readings", () => {
	assert.equal(computeDerived("delta", [80, 30, 999]), 50);
	assert.equal(computeDerived("percent", [8, 32, 999]), 25);
	assert.ok(isPairOperation("delta") && isPairOperation("percent") && !isPairOperation("sum"));
});

test("derived result is undefined when the calculation is impossible", () => {
	assert.equal(computeDerived("sum", [5]), undefined);
	assert.equal(computeDerived("percent", [5, 0]), undefined);
});
