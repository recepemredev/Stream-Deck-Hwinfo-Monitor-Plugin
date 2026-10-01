export type DerivedOperation = "sum" | "avg" | "max" | "min" | "delta" | "percent";

export const DERIVED_OPERATIONS: readonly DerivedOperation[] = ["sum", "avg", "max", "min", "delta", "percent"];

export const OPERATION_LABELS: Record<DerivedOperation, string> = {
	sum: "Sum",
	avg: "Average",
	max: "Maximum",
	min: "Minimum",
	delta: "Delta",
	percent: "Percent",
};

/** Delta and percent compare exactly the first two readings; the rest fold over all of them. */
const PAIR_OPERATIONS: readonly DerivedOperation[] = ["delta", "percent"];

export function isPairOperation(operation: DerivedOperation): boolean {
	return PAIR_OPERATIONS.includes(operation);
}

/** Returns undefined when the operation cannot be computed (too few values, division by zero). */
export function computeDerived(operation: DerivedOperation, values: readonly number[]): number | undefined {
	if (values.length < 2) return undefined;
	switch (operation) {
		case "sum":
			return values.reduce((a, b) => a + b, 0);
		case "avg":
			return values.reduce((a, b) => a + b, 0) / values.length;
		case "max":
			return Math.max(...values);
		case "min":
			return Math.min(...values);
		case "delta":
			return values[0] - values[1];
		case "percent":
			return values[1] === 0 ? undefined : (values[0] / values[1]) * 100;
	}
}
