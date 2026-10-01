import { action, type KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { findReading, type Reading } from "../hwinfo/types.js";
import { computeDerived, isPairOperation, OPERATION_LABELS } from "../metrics/derived.js";
import { convertUnit } from "../metrics/units.js";
import { actionUuid } from "../plugin-id.js";
import { normalizeDerivedSettings } from "../settings/derived.js";
import { activeEntries } from "../settings/fields.js";
import type { LiveTile } from "./live-tile.js";
import { KeyTileAction } from "./tile-action.js";
import { ValueTile, type ValueTileConfig } from "./value-tile.js";

/** A key showing one calculation over several readings. Derived values have no alert rules. */
export function parseDerivedConfig(raw: JsonObject): ValueTileConfig {
	const settings = normalizeDerivedSettings(raw);
	const { operation, readingCount, readingKeys, ...display } = settings;
	// Delta and percent only compare the first two selected readings; the other operations use all of them.
	const active = activeEntries(readingKeys, readingCount, (key) => key);
	const keys = isPairOperation(operation) ? active.slice(0, 2) : active;
	const title = OPERATION_LABELS[operation];
	return {
		display,
		alerts: false,
		source: {
			identity: `${operation}:${keys.join(",")}`,
			fallbackLabel: keys.length < 2 ? "Select sensors" : title,
			resolve(snapshot) {
				const readings = keys.map((key) => findReading(snapshot, key)).filter((r): r is Reading => r !== undefined);
				if (keys.length < 2 || readings.length !== keys.length) return undefined;
				const converted = readings.map((r) => convertUnit(r.value, r.unit, display.units));
				const value = computeDerived(operation, converted.map((c) => c.value));
				if (value === undefined) return undefined;
				return {
					value,
					unit: operation === "percent" ? "%" : converted[0].unit,
					type: readings[0].type,
					label: title,
				};
			},
		},
	};
}

@action({ UUID: actionUuid("derived") })
export class DerivedMetric extends KeyTileAction {
	protected override createTile(key: KeyAction<JsonObject>, raw: JsonObject): LiveTile {
		return new ValueTile(key, raw, parseDerivedConfig, this.globals);
	}
}
