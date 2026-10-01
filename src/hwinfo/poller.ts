import type { Snapshot } from "./types.js";

/** Where the poller gets its data from; injected so the loop can run without native memory access. */
export interface SnapshotSource {
	/** The current snapshot, or null while HWiNFO is unavailable. */
	read(): Snapshot | null;
	/** Releases any resources held between reads. */
	close(): void;
}

type Listener = (snapshot: Snapshot | null) => void;

/** What consumers need from the poller: the latest snapshot and change notifications. */
export interface SnapshotFeed {
	readonly snapshot: Snapshot | null;
	/** Returns a function that removes the listener. */
	subscribe(listener: Listener): () => void;
}

/** Single global polling loop shared by every key. Publishes a snapshot, or null while HWiNFO is unavailable. */
export class Poller implements SnapshotFeed {
	private readonly listeners = new Set<Listener>();
	private timer: NodeJS.Timeout | null = null;
	private latest: Snapshot | null = null;

	constructor(
		private readonly source: SnapshotSource,
		private intervalMs: number,
	) {}

	get snapshot(): Snapshot | null {
		return this.latest;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	start(): void {
		if (this.timer) return;
		this.tick();
		this.schedule();
	}

	setIntervalMs(intervalMs: number): void {
		if (intervalMs === this.intervalMs) return;
		this.intervalMs = intervalMs;
		if (!this.timer) return;
		clearInterval(this.timer);
		this.schedule();
	}

	stop(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		this.source.close();
	}

	private schedule(): void {
		this.timer = setInterval(() => this.tick(), this.intervalMs);
	}

	private tick(): void {
		this.latest = this.source.read();
		for (const listener of this.listeners) listener(this.latest);
	}
}
