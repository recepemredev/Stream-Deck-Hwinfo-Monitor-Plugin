import { History } from "./history.js";
import { ema } from "./smoothing.js";

/** Samples kept per tracked reading: one graph width of history (60 polls = 1 min at the default rate). */
export const HISTORY_CAPACITY = 60;

/** One tracked reading over time: EMA-smoothed current value plus its sample history. */
export class Series {
	private readonly history: History;
	private smoothed: number | undefined;

	constructor(readonly capacity = HISTORY_CAPACITY) {
		this.history = new History(capacity);
	}

	get value(): number | undefined {
		return this.smoothed;
	}

	get values(): readonly number[] {
		return this.history.values();
	}

	/** Adds a raw sample; `smoothingPercent` 0 = off. Returns the smoothed value that was recorded. */
	push(sample: number, smoothingPercent: number): number {
		this.smoothed = ema(this.smoothed, sample, 1 - smoothingPercent / 100);
		this.history.push(this.smoothed);
		return this.smoothed;
	}

	reset(): void {
		this.history.clear();
		this.smoothed = undefined;
	}
}
