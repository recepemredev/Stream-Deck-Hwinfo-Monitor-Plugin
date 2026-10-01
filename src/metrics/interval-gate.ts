/** Poll ticks jitter by a few ms; without slack a 1 s interval would skip every other tick. */
const SLACK_MS = 100;

/** Per-tile rate limiter: lets a sample through at most once per interval. */
export class IntervalGate {
	private last = 0;

	/** Returns true (and starts a new interval) when a sample is due. */
	take(intervalMs: number, now = Date.now()): boolean {
		if (now - this.last < intervalMs - SLACK_MS) return false;
		this.last = now;
		return true;
	}

	/** Makes the next `take` succeed immediately. */
	reset(): void {
		this.last = 0;
	}
}
