export type DecimalsSetting = "auto" | "0" | "1" | "2";

function autoDigits(value: number): number {
	const magnitude = Math.abs(value);
	if (magnitude >= 100) return 0;
	return magnitude >= 10 ? 1 : 2;
}

export function formatValue(value: number, decimals: DecimalsSetting): string {
	if (!Number.isFinite(value)) return "--";
	const digits = decimals === "auto" ? autoDigits(value) : Number(decimals);
	return value.toFixed(digits);
}

export function truncate(text: string, maxLength: number): string {
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

/** Replaces {value} and {unit} placeholders in an alert text template. */
export function applyTemplate(template: string, values: { value: string; unit: string }): string {
	return template.replaceAll("{value}", values.value).replaceAll("{unit}", values.unit);
}
