import { action, type KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { findReading } from "../hwinfo/types.js";
import { convertUnit } from "../metrics/units.js";
import { actionUuid } from "../plugin-id.js";
import { normalizeSettings } from "../settings/sensor.js";
import type { LiveTile } from "./live-tile.js";
import { KeyTileAction } from "./tile-action.js";
import { ValueTile, type ValueTileConfig } from "./value-tile.js";

/** A key tracking one HWiNFO reading, with the global alert rules for its type. */
export function parseSensorConfig(raw: JsonObject): ValueTileConfig {
	const { readingKey, alerts, ...display } = normalizeSettings(raw);
	return {
		display,
		alerts,
		source: {
			identity: readingKey,
			fallbackLabel: readingKey ? "No data" : "Select sensor",
			resolve(snapshot) {
				const reading = findReading(snapshot, readingKey);
				if (!reading) return undefined;
				return { ...convertUnit(reading.value, reading.unit, display.units), type: reading.type, label: reading.label };
			},
		},
	};
}

@action({ UUID: actionUuid("reading") })
export class SensorReading extends KeyTileAction {
	protected override createTile(key: KeyAction<JsonObject>, raw: JsonObject): LiveTile {
		return new ValueTile(key, raw, parseSensorConfig, this.globals);
	}
}
