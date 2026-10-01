import { HwinfoFormatError, parseSnapshot } from "./parser.js";
import type { SnapshotSource } from "./poller.js";
import type { SharedMemory } from "./shared-memory.js";
import type { Snapshot } from "./types.js";

/** Reads snapshots from HWiNFO's live shared memory. */
export class SharedMemorySnapshotSource implements SnapshotSource {
	constructor(private readonly memory: SharedMemory) {}

	read(): Snapshot | null {
		if (!this.memory.open()) return null;
		try {
			return parseSnapshot(this.memory.read());
		} catch (error) {
			if (!(error instanceof HwinfoFormatError)) throw error;
			// HWiNFO closed or restarted: drop the stale mapping so the next read reopens a fresh one.
			this.memory.close();
			return null;
		}
	}

	close(): void {
		this.memory.close();
	}
}
