import assert from "node:assert/strict";
import { test } from "node:test";
import { CompositeTile } from "../src/actions/composite.js";
import { ReadingType, type Reading, type Snapshot } from "../src/hwinfo/types.js";

const reading = (key: string, value: number): Reading => ({
	key, type: ReadingType.Temperature, sensorName: "CPU", label: `R${key}`, unit: "°C", value, min: 0, max: 0, avg: 0,
});
const snapshot = (...readings: Reading[]): Snapshot => ({ pollTime: 0, readings });

function harness(raw: Record<string, unknown>) {
	const images: string[] = [];
	const key = { setImage: (image: string) => void images.push(decodeURIComponent(image)) };
	const tile = new CompositeTile(key as never, raw as never);
	return { tile, last: () => images[images.length - 1] };
}

test("composite shows each slot's value, custom label and placeholder", () => {
	const h = harness({ slotCount: 3, slots: [{ readingKey: "1:0:1", label: "CPU" }, { readingKey: "1:0:2" }, {}], decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 56), reading("1:0:2", 71)));
	assert.match(h.last(), />CPU</);
	assert.match(h.last(), />56</);
	assert.match(h.last(), />R1:0:2</);
	assert.match(h.last(), />71</);
	assert.match(h.last(), />Select</);
	assert.equal(h.last().match(/id="slot\d"/g)?.length, 3);
});

test("composite marks a selected but missing reading as no data", () => {
	const h = harness({ slots: [{ readingKey: "1:0:1" }, { readingKey: "9:9:9" }] });
	h.tile.refresh(snapshot(reading("1:0:1", 56)));
	assert.match(h.last(), />No data</);
});

test("changing a slot's reading restarts only that slot's history", () => {
	const h = harness({ slots: [{ readingKey: "1:0:1" }, { readingKey: "1:0:2" }], decimals: "0" });
	h.tile.refresh(snapshot(reading("1:0:1", 10), reading("1:0:2", 20)));
	h.tile.applySettings({ slots: [{ readingKey: "1:0:1" }, { readingKey: "1:0:3" }], decimals: "0" } as never);
	h.tile.refresh(snapshot(reading("1:0:1", 10), reading("1:0:3", 90)));
	assert.match(h.last(), />90</);
	assert.match(h.last(), />10</);
});
