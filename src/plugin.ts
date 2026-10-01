import streamDeck from "@elgato/streamdeck";
import { SensorReading } from "./actions/sensor-reading.js";
import { SettingsAction } from "./actions/status.js";
import { Poller } from "./hwinfo/poller.js";
import { SharedMemory } from "./hwinfo/shared-memory.js";
import { SharedMemorySnapshotSource } from "./hwinfo/shared-memory-source.js";
import { DEFAULT_GLOBAL_SETTINGS } from "./settings/global-settings.js";
import { GlobalSettingsStore, type GlobalSettingsChannel } from "./settings/global-store.js";

// Composition root: the only place that creates concrete dependencies and wires them together.

const globalSettingsChannel: GlobalSettingsChannel = {
	get: () => streamDeck.settings.getGlobalSettings(),
	onChange: (listener) => void streamDeck.settings.onDidReceiveGlobalSettings((ev) => listener(ev.settings)),
};

const poller = new Poller(new SharedMemorySnapshotSource(new SharedMemory()), DEFAULT_GLOBAL_SETTINGS.pollMs);
const globals = new GlobalSettingsStore(globalSettingsChannel);
globals.subscribe((settings) => poller.setIntervalMs(settings.pollMs));

streamDeck.actions.registerAction(new SensorReading(poller, globals));
streamDeck.actions.registerAction(new SettingsAction(poller, globals));

poller.start();
void streamDeck
	.connect()
	.then(() => globals.start())
	.catch((error: unknown) => streamDeck.logger.error("Failed to start", error));
