/** Fixed-capacity sample buffer; the oldest sample is dropped when full. */
export class History {
	private samples: number[] = [];

	constructor(readonly capacity: number) {}

	push(value: number): void {
		this.samples.push(value);
		if (this.samples.length > this.capacity) this.samples.shift();
	}

	values(): readonly number[] {
		return this.samples;
	}

	clear(): void {
		this.samples = [];
	}
}
