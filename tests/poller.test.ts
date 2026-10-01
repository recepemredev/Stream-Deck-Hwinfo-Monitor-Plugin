import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { Poller, type SnapshotSource } from "../src/hwinfo/poller.js";
import { SharedMemorySnapshotSource } from "../src/hwinfo/shared-memory-source.js";
import type { Snapshot } from "../src/hwinfo/types.js";

function fakeSource(): SnapshotSource & { reads: number; closed: boolean } {
	return {
		reads: 0,
		closed: false,
		read() {
			this.reads += 1;
			return { pollTime: this.reads, readings: [] };
		},
		close() {
			this.closed = true;
		},
	};
}

test("poller reads immediately, then once per interval, and publishes to listeners", () => {
	mock.timers.enable({ apis: ["setInterval"] });
	try {
		const source = fakeSource();
		const poller = new Poller(source, 1000);
		const seen: (Snapshot | null)[] = [];
		poller.subscribe((snapshot) => seen.push(snapshot));
		poller.start();
		assert.equal(source.reads, 1);
		mock.timers.tick(2000);
		assert.equal(source.reads, 3);
		assert.equal(seen.length, 3);
		assert.equal(poller.snapshot?.pollTime, 3);
		poller.setIntervalMs(500);
		mock.timers.tick(1000);
		assert.equal(source.reads, 5);
		poller.stop();
		mock.timers.tick(5000);
		assert.equal(source.reads, 5);
		assert.ok(source.closed);
	} finally {
		mock.timers.reset();
	}
});

test("unsubscribed listeners stop receiving snapshots", () => {
	const poller = new Poller(fakeSource(), 1000);
	let calls = 0;
	const unsubscribe = poller.subscribe(() => (calls += 1));
	unsubscribe();
	poller.start();
	poller.stop();
	assert.equal(calls, 0);
});

test("shared-memory source yields null and closes the mapping on a malformed image", () => {
	let closed = 0;
	const memory = {
		open: () => true,
		read: () => Buffer.alloc(0),
		close: () => void (closed += 1),
	};
	const source = new SharedMemorySnapshotSource(memory as never);
	assert.equal(source.read(), null);
	assert.equal(closed, 1);
	assert.equal(new SharedMemorySnapshotSource({ ...memory, open: () => false } as never).read(), null);
	assert.throws(() => new SharedMemorySnapshotSource({ ...memory, read: () => { throw new Error("boom"); } } as never).read(), /boom/);
});
