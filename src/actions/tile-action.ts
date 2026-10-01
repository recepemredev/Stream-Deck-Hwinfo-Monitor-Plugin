import streamDeck, {
	SingletonAction,
	type Action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type NeoInfobarAction,
	type SendToPluginEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";
import type { SnapshotFeed } from "../hwinfo/poller.js";
import type { GlobalSettingsFeed } from "../settings/global-store.js";
import type { LiveTile } from "./live-tile.js";
import { isCatalogRequest, readingCatalog } from "./reading-catalog.js";

/**
 * Shared lifecycle for every action: one LiveTile per visible placement (`TSurface`: a key or the Neo
 * infobar), wired to the poller and global settings, plus the sensor-list reply the Property Inspector
 * pickers ask for. Subclasses only decide which surface they draw on and which tile they create.
 */
export abstract class TileAction<TSurface extends Action<JsonObject>> extends SingletonAction<JsonObject> {
	private readonly tiles = new Map<string, { tile: LiveTile; stop: () => void }>();

	constructor(
		private readonly feed: SnapshotFeed,
		protected readonly globals: GlobalSettingsFeed,
	) {
		super();
	}

	/** Returns the action as `TSurface`, or undefined when this action does not draw on that placement. */
	protected abstract surfaceOf(action: Action<JsonObject>): TSurface | undefined;

	protected abstract createTile(surface: TSurface, raw: JsonObject): LiveTile;

	override onWillAppear(ev: WillAppearEvent<JsonObject>): void {
		const surface = this.surfaceOf(ev.action);
		if (!surface) return;
		const tile = this.createTile(surface, ev.payload.settings);
		const stopPolling = this.feed.subscribe((snapshot) => tile.onSnapshot(snapshot));
		const stopGlobals = this.globals.subscribe(() => tile.refresh(this.feed.snapshot));
		this.tiles.set(surface.id, {
			tile,
			stop: () => {
				stopPolling();
				stopGlobals();
			},
		});
		tile.refresh(this.feed.snapshot);
	}

	override onWillDisappear(ev: WillDisappearEvent<JsonObject>): void {
		this.tiles.get(ev.action.id)?.stop();
		this.tiles.delete(ev.action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): void {
		const entry = this.tiles.get(ev.action.id);
		if (!entry) return;
		entry.tile.applySettings(ev.payload.settings);
		entry.tile.refresh(this.feed.snapshot);
	}

	override onKeyDown(ev: KeyDownEvent<JsonObject>): void {
		this.tiles.get(ev.action.id)?.tile.onPress?.(this.feed.snapshot);
	}

	override onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): void {
		if (!isCatalogRequest(ev.payload)) return;
		void streamDeck.ui.sendToPropertyInspector({ event: "readings", readings: readingCatalog(this.feed.snapshot) });
	}
}

/** A TileAction that draws on a keypad key. */
export abstract class KeyTileAction extends TileAction<KeyAction<JsonObject>> {
	protected override surfaceOf(action: Action<JsonObject>): KeyAction<JsonObject> | undefined {
		return action.isKey() ? action : undefined;
	}
}

/** A TileAction that draws on the Stream Deck Neo infobar. */
export abstract class InfobarTileAction extends TileAction<NeoInfobarAction<JsonObject>> {
	protected override surfaceOf(action: Action<JsonObject>): NeoInfobarAction<JsonObject> | undefined {
		return action.isNeoInfobar() ? action : undefined;
	}
}
