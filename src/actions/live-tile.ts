import type { JsonObject } from "@elgato/utils";
import type { Snapshot } from "../hwinfo/types.js";

/** One visible placement's live behavior: reacts to polls, settings changes and presses. */
export interface LiveTile {
	onSnapshot(snapshot: Snapshot | null): void;
	/** Re-samples and redraws immediately (settings or global rules changed). */
	refresh(snapshot: Snapshot | null): void;
	applySettings(raw: JsonObject): void;
	onPress?(snapshot: Snapshot | null): void;
}
