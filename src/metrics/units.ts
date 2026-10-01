export type UnitsSetting = "native" | "gb";

const BINARY = 1024;

/** Units that can be shown in GB, with the factor that converts them (HWiNFO reports memory in binary MB). */
const TO_GB: Record<string, { unit: string; divisor: number }> = {
	MB: { unit: "GB", divisor: BINARY },
	"MB/s": { unit: "GB/s", divisor: BINARY },
};

/** Converts a reading to the chosen display units; anything without a conversion is returned unchanged. */
export function convertUnit(value: number, unit: string, units: UnitsSetting): { value: number; unit: string } {
	const target = units === "gb" ? TO_GB[unit] : undefined;
	return target ? { value: value / target.divisor, unit: target.unit } : { value, unit };
}
