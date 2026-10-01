import { toDataUri } from "./svg.js";

/**
 * Sends rendered SVGs to one Stream Deck surface, skipping frames identical to the last one sent.
 * Most polls change nothing visible, and every image costs a WebSocket round trip to Stream Deck.
 */
export class ImageSink {
	private last = "";

	/** `write` delivers a data URI to the device (setImage for keys, setFeedback for the infobar). */
	constructor(private readonly write: (image: string) => void) {}

	show(svg: string): void {
		const image = toDataUri(svg);
		if (image === this.last) return;
		this.last = image;
		this.write(image);
	}

	/** Forces the next frame through even if it is unchanged (used after a settings change). */
	invalidate(): void {
		this.last = "";
	}
}
