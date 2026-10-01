import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCompositeSettings } from "../src/settings/composite.js";
import { normalizeDerivedSettings } from "../src/settings/derived.js";
import { activeEntries } from "../src/settings/fields.js";
import { DEFAULT_GLOBAL_SETTINGS, normalizeGlobalSettings } from "../src/settings/global-settings.js";
import { GlobalSettingsStore, type GlobalSettingsChannel } from "../src/settings/global-store.js";
import { normalizeInfobarSettings } from "../src/settings/infobar.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings/sensor.js";

// Sensor Reading

test("sensor: empty input yields defaults", () => {
	assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
});

test("sensor: valid input is kept", () => {
	const s = normalizeSettings({ readingKey: "12:0:7", mode: "graph", smoothing: 40, intervalMs: "2000", color: "#00ff00", font: "Consolas", decimals: "1" });
	assert.equal(s.readingKey, "12:0:7");
	assert.equal(s.mode, "graph");
	assert.equal(s.smoothing, 40);
	assert.equal(s.intervalMs, 2000);
	assert.equal(s.color, "#00ff00");
	assert.equal(s.decimals, "1");
});

test("sensor: invalid input is rejected", () => {
	const s = normalizeSettings({ readingKey: "x\"><script>", mode: "evil", smoothing: 999, intervalMs: 7, color: "red", font: "Comic\" onload=\"", label: "x".repeat(100) });
	assert.equal(s.readingKey, "");
	assert.equal(s.mode, "both");
	assert.equal(s.smoothing, 90);
	assert.equal(s.intervalMs, 0);
	assert.equal(s.color, "");
	assert.equal(s.font, DEFAULT_SETTINGS.font);
	assert.equal(s.label.length, 24);
});

test("sensor: ring max and donut mode are validated", () => {
	assert.equal(normalizeSettings({ mode: "donut" }).mode, "donut");
	assert.equal(normalizeSettings({ gaugeMax: 16 }).gaugeMax, 16);
	assert.equal(normalizeSettings({ gaugeMax: -5 }).gaugeMax, 100);
	assert.equal(normalizeSettings({ gaugeMax: "abc" }).gaugeMax, 100);
	assert.equal(normalizeSettings({ gaugeMax: 1e12 }).gaugeMax, 1_000_000);
});

// Shared fields across panels

test("background setting is validated on every panel", () => {
	assert.equal(normalizeSettings({ background: "#204080" }).background, "#204080");
	assert.equal(normalizeSettings({ background: "red" }).background, "");
	assert.equal(normalizeSettings({ background: '"><script>' }).background, "");
	assert.equal(normalizeSettings({}).background, "");
	assert.equal(normalizeCompositeSettings({ background: "#112233" }).background, "#112233");
	assert.equal(normalizeInfobarSettings({ background: "#112233" }).background, "#112233");
	assert.equal(normalizeInfobarSettings({ background: 5 }).background, "");
});

test("units setting is validated everywhere it exists", () => {
	assert.equal(normalizeSettings({ units: "gb" }).units, "gb");
	assert.equal(normalizeSettings({ units: "tb" }).units, "native");
	assert.equal(normalizeCompositeSettings({ units: "gb" }).units, "gb");
	assert.equal(normalizeInfobarSettings({ units: "gb" }).units, "gb");
	assert.equal(normalizeInfobarSettings({}).units, "native");
});

test("active entries are the first `count` slots with a reading set", () => {
	assert.deepEqual(activeEntries(["1:0:1", "", "1:0:2", "1:0:3"], 3, (key) => key), ["1:0:1", "1:0:2"]);
	const slots = [{ key: "1:0:1", label: "A" }, { key: "", label: "B" }];
	assert.deepEqual(activeEntries(slots, 2, (slot) => slot.key), [{ key: "1:0:1", label: "A" }]);
});

// Composite, Derived Metric, Infobar

test("composite settings always hold four sanitized slots", () => {
	const s = normalizeCompositeSettings({ slotCount: 9, slots: [{ readingKey: "1:0:2", color: "#00ff00" }, { readingKey: "bad" }, "junk"] });
	assert.equal(s.slotCount, 4);
	assert.equal(s.slots.length, 4);
	assert.equal(s.slots[0].readingKey, "1:0:2");
	assert.equal(s.slots[0].color, "#00ff00");
	assert.equal(s.slots[1].readingKey, "");
	assert.equal(s.slots[3].label, "");
	assert.equal(normalizeCompositeSettings({}).slotCount, 2);
	assert.equal(normalizeCompositeSettings({ slotCount: 1 }).slotCount, 2);
});

test("derived settings are sanitized and padded to eight keys", () => {
	const s = normalizeDerivedSettings({ operation: "evil", readingCount: 99, readingKeys: ["1:0:1", "x", 5, "2:0:2"], mode: "graph" });
	assert.equal(s.operation, "sum");
	assert.equal(s.readingCount, 8);
	assert.equal(s.readingKeys.length, 8);
	assert.equal(s.mode, "graph");
	assert.deepEqual(activeEntries(s.readingKeys, 4, (key) => key), ["1:0:1", "2:0:2"]);
	assert.equal(normalizeDerivedSettings({}).readingCount, 2);
});

test("infobar settings are sanitized", () => {
	const s = normalizeInfobarSettings({ style: "bad", readingCount: 99, cycleMs: 1, readingKeys: ["1:0:1", "x"] });
	assert.equal(s.style, "single");
	assert.equal(s.readingCount, 8);
	assert.equal(s.cycleMs, 5000);
	assert.equal(s.readingKeys.length, 8);
	assert.equal(s.readingKeys[1], "");
	assert.deepEqual(normalizeInfobarSettings({ readingLabels: ["CPU", 5, "x".repeat(50)] }).readingLabels.slice(0, 4), ["CPU", "", "x".repeat(24), ""]);
	assert.equal(normalizeInfobarSettings({}).readingCount, 1);
});

// Global settings


test("global: empty input yields defaults", () => {
	assert.deepEqual(normalizeGlobalSettings({}), DEFAULT_GLOBAL_SETTINGS);
});

test("valid rule is kept, invalid values are sanitized", () => {
	const s = normalizeGlobalSettings({
		pollMs: 500,
		thresholds: [
			{ id: "abc-1", readingType: 1, comparison: "below", value: "12.5", hysteresis: -3, dwellMs: 99999999, sticky: true, snoozeMs: 900000, color: "nope", text: "x".repeat(50) },
		],
	});
	assert.equal(s.pollMs, 500);
	assert.equal(s.thresholds.length, 1);
	const [rule] = s.thresholds;
	assert.equal(rule.comparison, "below");
	assert.equal(rule.value, 12.5);
	assert.equal(rule.hysteresis, 0);
	assert.equal(rule.dwellMs, 3600000);
	assert.equal(rule.color, "#ff4d4f");
	assert.equal(rule.text.length, 24);
});

test("bad poll rate, bad ids and unknown types are dropped", () => {
	const s = normalizeGlobalSettings({
		pollMs: 3,
		thresholds: [{ id: "bad id!", readingType: 1 }, { id: "ok", readingType: 99 }, "junk", null],
	});
	assert.equal(s.pollMs, 1000);
	assert.equal(s.thresholds.length, 0);
});

test("rule count is capped", () => {
	const thresholds = Array.from({ length: 50 }, (_, i) => ({ id: `r${i}`, readingType: 1 }));
	assert.equal(normalizeGlobalSettings({ thresholds }).thresholds.length, 20);
});

test("global: reading type 0 (None) is not a valid rule target", () => {
	assert.equal(normalizeGlobalSettings({ thresholds: [{ id: "a", readingType: 0 }, { id: "b", readingType: 8 }] }).thresholds.length, 1);
});

test("global store validates the stored settings and follows changes", async () => {
	let push: (raw: Record<string, unknown>) => void = () => {};
	const channel: GlobalSettingsChannel = {
		get: async () => ({ pollMs: 500 }),
		onChange: (listener) => (push = listener as never),
	};
	const store = new GlobalSettingsStore(channel);
	const seen: number[] = [];
	store.subscribe((settings) => seen.push(settings.pollMs));
	assert.equal(store.current.pollMs, DEFAULT_GLOBAL_SETTINGS.pollMs);
	await store.start();
	push({ pollMs: 7 });
	assert.deepEqual(seen, [500, 1000]);
});
