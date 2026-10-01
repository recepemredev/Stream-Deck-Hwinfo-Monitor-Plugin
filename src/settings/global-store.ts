import type { JsonObject } from "@elgato/utils";
import { DEFAULT_GLOBAL_SETTINGS, normalizeGlobalSettings, type GlobalSettings } from "./global-settings.js";

/** Where the raw global settings live; the Stream Deck SDK in production, a stub in tests. */
export interface GlobalSettingsChannel {
	get(): Promise<JsonObject>;
	onChange(listener: (raw: JsonObject) => void): void;
}

type Listener = (settings: GlobalSettings) => void;

/** Holds the validated global settings and notifies listeners when the Property Inspector changes them. */
export class GlobalSettingsStore {
	private value: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
	private readonly listeners = new Set<Listener>();

	constructor(private readonly channel: GlobalSettingsChannel) {}

	get current(): GlobalSettings {
		return this.value;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Reads the stored settings once and starts following later changes. Call after connecting. */
	async start(): Promise<void> {
		this.channel.onChange((raw) => this.apply(raw));
		this.apply(await this.channel.get());
	}

	private apply(raw: JsonObject): void {
		this.value = normalizeGlobalSettings(raw);
		for (const listener of this.listeners) listener(this.value);
	}
}
