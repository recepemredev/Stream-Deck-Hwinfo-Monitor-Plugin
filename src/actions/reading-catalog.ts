import type { JsonValue } from "@elgato/utils";
import type { Snapshot } from "../hwinfo/types.js";
import { isJsonObject } from "../settings/fields.js";

/** What the Property Inspector's sensor picker lists for one reading (no live values). */
export type ReadingCatalogEntry = {
	key: string;
	label: string;
	sensor: string;
	type: number;
	unit: string;
};

export function readingCatalog(snapshot: Snapshot | null): ReadingCatalogEntry[] {
	return (snapshot?.readings ?? []).map((r) => ({
		key: r.key,
		label: r.label,
		sensor: r.sensorName,
		type: r.type,
		unit: r.unit,
	}));
}

/** The picker asks with `{ event: "getReadings" }` (see ui/sensor-picker.js). */
export function isCatalogRequest(payload: JsonValue): boolean {
	return isJsonObject(payload) && payload.event === "getReadings";
}
