/** Exponential moving average. alpha 1 = no smoothing, values near 0 = heavy smoothing. */
export function ema(previous: number | undefined, sample: number, alpha: number): number {
	return previous === undefined ? sample : previous + alpha * (sample - previous);
}
