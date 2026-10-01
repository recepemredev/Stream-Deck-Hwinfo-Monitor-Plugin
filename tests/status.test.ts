import assert from "node:assert/strict";
import { test } from "node:test";
import { StatusTile } from "../src/actions/status.js";

function harness(pollMs = 1000) {
	const images: string[] = [];
	const key = { setImage: (image: string) => void images.push(decodeURIComponent(image)) };
	const tile = new StatusTile(key as never, { current: { pollMs, thresholds: [] }, subscribe: () => () => {} });
	return { tile, images };
}

test("status key shows waiting until HWiNFO publishes, then the reading count and poll rate", () => {
	const h = harness(500);
	h.tile.refresh(null);
	assert.match(h.images[0], />Waiting</);
	h.tile.onSnapshot({ pollTime: 0, readings: [] });
	assert.match(h.images[1], />Live</);
	assert.match(h.images[1], /0 readings · 500 ms/);
});

test("status key does not resend an unchanged image", () => {
	const h = harness();
	h.tile.onSnapshot(null);
	h.tile.onSnapshot(null);
	assert.equal(h.images.length, 1);
});
