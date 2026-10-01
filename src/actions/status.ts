import { action, type KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import type { Snapshot } from "../hwinfo/types.js";
import { actionUuid } from "../plugin-id.js";
import { ImageSink } from "../render/image-sink.js";
import { renderStatusTile } from "../render/status.js";
import type { GlobalSettingsFeed } from "../settings/global-store.js";
import type { LiveTile } from "./live-tile.js";
import { KeyTileAction } from "./tile-action.js";

/** Connection status key: whether HWiNFO is readable, how many readings it publishes, and the poll rate. */
export class StatusTile implements LiveTile {
	private readonly sink: ImageSink;

	constructor(
		key: KeyAction<JsonObject>,
		private readonly globals: GlobalSettingsFeed,
	) {
		this.sink = new ImageSink((image) => void key.setImage(image));
	}

	/** The status key has no per-key settings; everything it shows is global. */
	applySettings(): void {}

	onSnapshot(snapshot: Snapshot | null): void {
		this.sink.show(
			renderStatusTile({
				connected: snapshot !== null,
				readingCount: snapshot?.readings.length ?? 0,
				pollMs: this.globals.current.pollMs,
			}),
		);
	}

	refresh(snapshot: Snapshot | null): void {
		this.onSnapshot(snapshot);
	}
}

/** The "Settings" action: a status key whose Property Inspector holds the poll rate and alert-rule library. */
@action({ UUID: actionUuid("settings") })
export class SettingsAction extends KeyTileAction {
	protected override createTile(key: KeyAction<JsonObject>): LiveTile {
		return new StatusTile(key, this.globals);
	}
}
