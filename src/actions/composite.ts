import { action, type KeyAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { findReading, ReadingType, type Snapshot } from "../hwinfo/types.js";
import { IntervalGate } from "../metrics/interval-gate.js";
import { HISTORY_CAPACITY, Series } from "../metrics/series.js";
import { convertUnit } from "../metrics/units.js";
import { actionUuid } from "../plugin-id.js";
import { renderComposite } from "../render/composite.js";
import { ImageSink } from "../render/image-sink.js";
import type { ReadingModel } from "../render/reading-model.js";
import { accentFor, SLOT_COLORS } from "../render/theme.js";
import { MAX_SLOTS, normalizeCompositeSettings, type CompositeSettings } from "../settings/composite.js";
import type { LiveTile } from "./live-tile.js";
import { toReadingModel } from "./reading-view.js";
import { KeyTileAction } from "./tile-action.js";

/** One Composite key: tracks up to four readings and draws their values with overlaid graphs. */
export class CompositeTile implements LiveTile {
	/** One series per slot position, so a slot keeps its history while other slots change. */
	private readonly series = Array.from({ length: MAX_SLOTS }, () => new Series());
	private readonly gate = new IntervalGate();
	private readonly sink: ImageSink;
	private settings: CompositeSettings;

	constructor(key: KeyAction<JsonObject>, raw: JsonObject) {
		this.sink = new ImageSink((image) => void key.setImage(image));
		this.settings = normalizeCompositeSettings(raw);
	}

	applySettings(raw: JsonObject): void {
		const next = normalizeCompositeSettings(raw);
		next.slots.forEach((slot, i) => {
			if (slot.readingKey !== this.settings.slots[i].readingKey) this.series[i].reset();
		});
		this.settings = next;
		this.sink.invalidate();
	}

	onSnapshot(snapshot: Snapshot | null): void {
		if (!this.gate.take(this.settings.intervalMs)) return;
		this.activeSlots().forEach((slot, i) => {
			const reading = findReading(snapshot, slot.readingKey);
			if (reading) this.series[i].push(convertUnit(reading.value, reading.unit, this.settings.units).value, this.settings.smoothing);
		});
		this.draw(snapshot);
	}

	refresh(snapshot: Snapshot | null): void {
		this.gate.reset();
		this.onSnapshot(snapshot);
	}

	/** Unlike the other multi-reading actions, empty slots stay visible and ask for a sensor. */
	private activeSlots(): CompositeSettings["slots"] {
		return this.settings.slots.slice(0, this.settings.slotCount);
	}

	private slotModel(index: number, snapshot: Snapshot | null): ReadingModel {
		const slot = this.settings.slots[index];
		const reading = findReading(snapshot, slot.readingKey);
		return toReadingModel(reading, this.series[index], {
			label: slot.label || reading?.label || (slot.readingKey ? "No data" : "Select"),
			accent: slot.color || (reading ? SLOT_COLORS[index] : accentFor(ReadingType.Other)),
			decimals: this.settings.decimals,
			units: this.settings.units,
		});
	}

	private draw(snapshot: Snapshot | null): void {
		const slots = this.activeSlots().map((_, i) => this.slotModel(i, snapshot));
		this.sink.show(renderComposite({ slots, capacity: HISTORY_CAPACITY, font: this.settings.font, background: this.settings.background }));
	}
}

@action({ UUID: actionUuid("composite") })
export class Composite extends KeyTileAction {
	protected override createTile(key: KeyAction<JsonObject>, raw: JsonObject): LiveTile {
		return new CompositeTile(key, raw);
	}
}
