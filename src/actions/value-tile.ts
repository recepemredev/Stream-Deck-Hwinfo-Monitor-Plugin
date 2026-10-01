import type { KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { TileAlerts, type ThresholdRule } from "../alerts/threshold.js";
import { ReadingType, type Snapshot } from "../hwinfo/types.js";
import { IntervalGate } from "../metrics/interval-gate.js";
import { HISTORY_CAPACITY, Series } from "../metrics/series.js";
import { applyTemplate, formatValue, truncate } from "../render/format.js";
import { resolveRange } from "../render/graph.js";
import { ImageSink } from "../render/image-sink.js";
import { accentFor } from "../render/theme.js";
import { renderTile } from "../render/tile.js";
import type { DisplaySettings } from "../settings/display.js";
import type { GlobalSettingsFeed } from "../settings/global-store.js";
import type { LiveTile } from "./live-tile.js";

/** Longest label that fits a key at the smallest label font size. */
const LABEL_MAX = 16;

export interface ResolvedValue {
	value: number;
	unit: string;
	type: ReadingType;
	label: string;
}

/** Where a key's number comes from: a single reading, or a calculation over several. */
export interface ValueSource {
	/** Changes whenever the tracked quantity changes; history and alerts restart then. */
	identity: string;
	/** Label shown while nothing resolves and the user set none. */
	fallbackLabel: string;
	resolve(snapshot: Snapshot | null): ResolvedValue | undefined;
}

export interface ValueTileConfig {
	display: DisplaySettings;
	/** Whether the global threshold rules apply to this key. */
	alerts: boolean;
	source: ValueSource;
}

export type ConfigParser = (raw: JsonObject) => ValueTileConfig;

/** A key showing one number with text, graph and alerts; the source decides what the number is. */
export class ValueTile implements LiveTile {
	private readonly series = new Series();
	private readonly alerts = new TileAlerts();
	private readonly gate = new IntervalGate();
	private readonly sink: ImageSink;
	private config: ValueTileConfig;

	constructor(
		key: KeyAction<JsonObject>,
		raw: JsonObject,
		private readonly parse: ConfigParser,
		private readonly globals: GlobalSettingsFeed,
	) {
		this.sink = new ImageSink((image) => void key.setImage(image));
		this.config = parse(raw);
	}

	applySettings(raw: JsonObject): void {
		const next = this.parse(raw);
		if (next.source.identity !== this.config.source.identity) {
			this.series.reset();
			this.alerts.reset();
		}
		this.config = next;
		this.sink.invalidate();
	}

	onSnapshot(snapshot: Snapshot | null): void {
		if (!this.gate.take(this.config.display.intervalMs)) return;
		this.sample(this.config.source.resolve(snapshot));
		this.draw(snapshot);
	}

	refresh(snapshot: Snapshot | null): void {
		this.gate.reset();
		this.onSnapshot(snapshot);
	}

	/** Key press: snoozes or resumes the active alert. */
	onPress(snapshot: Snapshot | null): void {
		const resolved = this.config.source.resolve(snapshot);
		if (resolved && this.series.value !== undefined) {
			this.alerts.press(this.rulesFor(resolved), this.series.value, Date.now());
		}
		this.draw(snapshot);
	}

	private sample(resolved: ResolvedValue | undefined): void {
		if (!resolved) return;
		const value = this.series.push(resolved.value, this.config.display.smoothing);
		this.alerts.update(this.rulesFor(resolved), value, Date.now());
	}

	private rulesFor(resolved: ResolvedValue): readonly ThresholdRule[] {
		if (!this.config.alerts) return [];
		return this.globals.current.thresholds.filter((rule) => rule.readingType === resolved.type);
	}

	private draw(snapshot: Snapshot | null): void {
		const { display, source } = this.config;
		const resolved = source.resolve(snapshot);
		const current = this.series.value;
		const live = resolved && current !== undefined ? { resolved, value: current } : null;
		const valueText = live ? formatValue(live.value, display.decimals) : "--";
		const unit = resolved?.unit ?? "";
		const alert = live ? this.alerts.view(this.rulesFor(live.resolved), Date.now()) : null;
		const showing = alert !== null && alert.snooze === null;
		const values = this.series.values;
		const label = showing && alert.rule.text
			? applyTemplate(alert.rule.text, { value: valueText, unit })
			: display.label || resolved?.label || source.fallbackLabel;
		this.sink.show(renderTile({
			mode: display.mode,
			graphStyle: display.graphStyle,
			label: truncate(label, LABEL_MAX),
			value: valueText,
			unit,
			accent: showing ? alert.rule.color : display.color || accentFor(resolved?.type ?? ReadingType.Other),
			font: display.font,
			background: display.background,
			values,
			capacity: HISTORY_CAPACITY,
			range: resolveRange(values, unit),
			stale: !resolved,
			fraction: live ? Math.min(1, Math.max(0, live.value / display.gaugeMax)) : null,
			alert: alert ? { color: alert.rule.color, snooze: alert.snooze } : null,
		}));
	}
}
