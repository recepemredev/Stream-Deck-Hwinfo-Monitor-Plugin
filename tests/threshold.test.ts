import assert from "node:assert/strict";
import { test } from "node:test";
import { TileAlerts, type ThresholdRule } from "../src/alerts/threshold.js";

const RULE: ThresholdRule = {
	id: "r1", readingType: 1, comparison: "above", value: 80, hysteresis: 5,
	dwellMs: 0, cooldownMs: 0, sticky: false, snoozeMs: 60000, color: "#ff4d4f", text: "",
};
const rules = (over: Partial<ThresholdRule> = {}): ThresholdRule[] => [{ ...RULE, ...over }];

test("activates at the threshold and clears only past the hysteresis", () => {
	const alerts = new TileAlerts();
	alerts.update(rules(), 79, 0);
	assert.equal(alerts.view(rules(), 0), null);
	alerts.update(rules(), 80, 1000);
	assert.ok(alerts.view(rules(), 1000));
	alerts.update(rules(), 77, 2000); // inside hysteresis band
	assert.ok(alerts.view(rules(), 2000));
	alerts.update(rules(), 74, 3000);
	assert.equal(alerts.view(rules(), 3000), null);
});

test("below comparison", () => {
	const r = rules({ comparison: "below", value: 500, hysteresis: 50 });
	const alerts = new TileAlerts();
	alerts.update(r, 400, 0);
	assert.ok(alerts.view(r, 0));
	alerts.update(r, 540, 1000);
	assert.ok(alerts.view(r, 1000));
	alerts.update(r, 551, 2000);
	assert.equal(alerts.view(r, 2000), null);
});

test("dwell requires a continuous breach", () => {
	const r = rules({ dwellMs: 3000 });
	const alerts = new TileAlerts();
	alerts.update(r, 90, 0);
	alerts.update(r, 90, 2000);
	assert.equal(alerts.view(r, 2000), null);
	alerts.update(r, 70, 2500); // breach interrupted
	alerts.update(r, 90, 3000);
	alerts.update(r, 90, 5000);
	assert.equal(alerts.view(r, 5000), null);
	alerts.update(r, 90, 6000);
	assert.ok(alerts.view(r, 6000));
});

test("cooldown blocks re-activation after clearing", () => {
	const r = rules({ cooldownMs: 10000 });
	const alerts = new TileAlerts();
	alerts.update(r, 90, 0);
	alerts.update(r, 50, 1000); // clears
	alerts.update(r, 90, 5000);
	assert.equal(alerts.view(r, 5000), null);
	alerts.update(r, 90, 12000);
	assert.ok(alerts.view(r, 12000));
});

test("sticky alert stays until acknowledged by a key press", () => {
	const r = rules({ sticky: true });
	const alerts = new TileAlerts();
	alerts.update(r, 90, 0);
	alerts.update(r, 50, 1000);
	assert.ok(alerts.view(r, 1000));
	alerts.press(r, 50, 2000);
	assert.equal(alerts.view(r, 2000), null);
});

test("press snoozes with a countdown, second press resumes", () => {
	const r = rules({ snoozeMs: 60000 });
	const alerts = new TileAlerts();
	alerts.update(r, 90, 0);
	alerts.press(r, 90, 0);
	assert.equal(alerts.view(r, 30000)?.snooze, 0.5);
	assert.equal(alerts.view(r, 60001)?.snooze, null); // expired: alert shows again
	alerts.press(r, 90, 61000);
	assert.equal(alerts.view(r, 61500)?.snooze, 1 - 500 / 60000);
	alerts.press(r, 90, 62000);
	assert.equal(alerts.view(r, 62000)?.snooze, null);
});

test("snooze until resumed never expires", () => {
	const r = rules({ snoozeMs: 0 });
	const alerts = new TileAlerts();
	alerts.update(r, 90, 0);
	alerts.press(r, 90, 0);
	assert.equal(alerts.view(r, 10 * 3600000)?.snooze, 1);
});
