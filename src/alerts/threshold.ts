import type { ReadingType } from "../hwinfo/types.js";

export type ThresholdRule = {
	id: string;
	readingType: ReadingType;
	comparison: "above" | "below";
	value: number;
	/** Distance the value must recover past `value` before the alert clears. */
	hysteresis: number;
	/** The breach must last this long before the alert activates. */
	dwellMs: number;
	/** After the alert clears, it cannot re-activate for this long. */
	cooldownMs: number;
	/** Stays active after recovery until the key is pressed. */
	sticky: boolean;
	/** How long a key press silences an active alert; 0 = until pressed again. */
	snoozeMs: number;
	color: string;
	/** Optional label replacement; supports {value} and {unit}. */
	text: string;
};

export interface AlertView {
	rule: ThresholdRule;
	/** Remaining snooze 0..1 while snoozed, null while the alert is showing. */
	snooze: number | null;
}

function isBreached(rule: ThresholdRule, value: number): boolean {
	return rule.comparison === "above" ? value >= rule.value : value <= rule.value;
}

function isRecovered(rule: ThresholdRule, value: number): boolean {
	return rule.comparison === "above" ? value < rule.value - rule.hysteresis : value > rule.value + rule.hysteresis;
}

/** State machine for one rule on one tile. Time and the current rule are passed in, so edits apply immediately. */
export class RuleTracker {
	private active = false;
	private breachSince: number | null = null;
	private clearedAt = Number.NEGATIVE_INFINITY;
	private snoozedUntil = 0;

	get isActive(): boolean {
		return this.active;
	}

	update(rule: ThresholdRule, value: number, now: number): void {
		if (this.active) {
			if (!rule.sticky && isRecovered(rule, value)) this.deactivate(now);
			return;
		}
		if (!isBreached(rule, value)) {
			this.breachSince = null;
			return;
		}
		if (now - this.clearedAt < rule.cooldownMs) return;
		this.breachSince ??= now;
		if (now - this.breachSince >= rule.dwellMs) {
			this.active = true;
			this.breachSince = null;
		}
	}

	/** Key press: resumes a snoozed alert, acknowledges a recovered sticky one, otherwise snoozes. */
	press(rule: ThresholdRule, value: number, now: number): void {
		if (!this.active) return;
		if (this.isSnoozed(now)) {
			this.snoozedUntil = 0;
		} else if (rule.sticky && isRecovered(rule, value)) {
			this.deactivate(now);
		} else {
			this.snoozedUntil = rule.snoozeMs === 0 ? Number.POSITIVE_INFINITY : now + rule.snoozeMs;
		}
	}

	/** Remaining snooze as 0..1, or null when not snoozed. */
	snoozeRemaining(rule: ThresholdRule, now: number): number | null {
		if (!this.isSnoozed(now)) return null;
		if (this.snoozedUntil === Number.POSITIVE_INFINITY) return 1;
		return Math.min(1, (this.snoozedUntil - now) / rule.snoozeMs);
	}

	private isSnoozed(now: number): boolean {
		return now < this.snoozedUntil;
	}

	private deactivate(now: number): void {
		this.active = false;
		this.clearedAt = now;
		this.snoozedUntil = 0;
		this.breachSince = null;
	}
}

/** All rule trackers of one tile, keyed by rule id so editing a rule keeps its state. */
export class TileAlerts {
	private trackers = new Map<string, RuleTracker>();

	reset(): void {
		this.trackers.clear();
	}

	update(rules: readonly ThresholdRule[], value: number, now: number): void {
		this.sync(rules);
		for (const rule of rules) this.trackers.get(rule.id)?.update(rule, value, now);
	}

	/** Applies a key press to the first active rule. */
	press(rules: readonly ThresholdRule[], value: number, now: number): void {
		this.sync(rules);
		const rule = this.firstActive(rules);
		if (rule) this.trackers.get(rule.id)?.press(rule, value, now);
	}

	view(rules: readonly ThresholdRule[], now: number): AlertView | null {
		this.sync(rules);
		const rule = this.firstActive(rules);
		if (!rule) return null;
		return { rule, snooze: this.trackers.get(rule.id)?.snoozeRemaining(rule, now) ?? null };
	}

	private firstActive(rules: readonly ThresholdRule[]): ThresholdRule | undefined {
		return rules.find((r) => this.trackers.get(r.id)?.isActive);
	}

	private sync(rules: readonly ThresholdRule[]): void {
		const ids = new Set(rules.map((r) => r.id));
		for (const id of this.trackers.keys()) if (!ids.has(id)) this.trackers.delete(id);
		for (const rule of rules) if (!this.trackers.has(rule.id)) this.trackers.set(rule.id, new RuleTracker());
	}
}
