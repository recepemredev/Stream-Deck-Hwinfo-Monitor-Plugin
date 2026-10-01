import streamDeck, { action, type NeoInfobarAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { findReading, ReadingType, type Snapshot } from "../hwinfo/types.js";
import { HISTORY_CAPACITY, Series } from "../metrics/series.js";
import { convertUnit } from "../metrics/units.js";
import { actionUuid } from "../plugin-id.js";
import { ImageSink } from "../render/image-sink.js";
import { renderInfobar } from "../render/infobar.js";
import type { ReadingModel } from "../render/reading-model.js";
import { accentFor } from "../render/theme.js";
import { activeEntries } from "../settings/fields.js";
import { normalizeInfobarSettings, type InfobarSettings } from "../settings/infobar.js";
import type { LiveTile } from "./live-tile.js";
import { toReadingModel } from "./reading-view.js";
import { InfobarTileAction } from "./tile-action.js";

const OVERVIEW_PER_PAGE = 3;
/** One full-bar pixmap; the plugin draws the whole infobar as a single SVG. */
const LAYOUT_PATH = "layouts/infobar.json";
/** Key of the pixmap item declared in the layout file. */
const CANVAS_KEY = "canvas";

/** A chosen reading with the custom name the user gave it, if any. */
interface InfobarSlot {
	key: string;
	label: string;
}

/**
 * The Neo infobar: cycles through the chosen readings, one at a time or several side by side.
 * The SDK has no touch event for the infobar, so pages advance on a timer.
 */
export class InfobarTile implements LiveTile {
	private readonly series = new Map<string, Series>();
	private readonly sink: ImageSink;
	private settings: InfobarSettings;
	private page = 0;
	private pageStartedAt = Date.now();

	constructor(bar: NeoInfobarAction<JsonObject>, raw: JsonObject) {
		this.settings = normalizeInfobarSettings(raw);
		const layoutReady = bar.setFeedbackLayout(LAYOUT_PATH);
		layoutReady.catch((error: unknown) => streamDeck.logger.error("Failed to set infobar layout", error));
		// Feedback sent before the layout is applied would target a canvas that does not exist yet.
		this.sink = new ImageSink((image) => void layoutReady.then(() => bar.setFeedback({ [CANVAS_KEY]: image })));
	}

	applySettings(raw: JsonObject): void {
		this.settings = normalizeInfobarSettings(raw);
		this.page = 0;
		this.pageStartedAt = Date.now();
		this.sink.invalidate();
	}

	onSnapshot(snapshot: Snapshot | null): void {
		const slots = this.slots();
		this.sample(slots, snapshot);
		this.advancePage(slots.length);
		this.draw(slots, snapshot);
	}

	refresh(snapshot: Snapshot | null): void {
		this.onSnapshot(snapshot);
	}

	/** The first `readingCount` positions that have a reading chosen, keeping each one's custom label. */
	private slots(): InfobarSlot[] {
		const { readingKeys, readingLabels, readingCount } = this.settings;
		const slots = readingKeys.map((key, i) => ({ key, label: readingLabels[i] }));
		return activeEntries(slots, readingCount, (slot) => slot.key);
	}

	private perPage(): number {
		return this.settings.style === "overview" ? OVERVIEW_PER_PAGE : 1;
	}

	private pageCount(slotCount: number): number {
		return Math.max(1, Math.ceil(slotCount / this.perPage()));
	}

	/** Records every chosen reading on each poll so graphs are ready when their page comes up. */
	private sample(slots: InfobarSlot[], snapshot: Snapshot | null): void {
		const keys = slots.map((slot) => slot.key);
		for (const key of this.series.keys()) if (!keys.includes(key)) this.series.delete(key);
		for (const key of keys) {
			const reading = findReading(snapshot, key);
			if (!reading) continue;
			const series = this.series.get(key) ?? new Series();
			this.series.set(key, series);
			series.push(convertUnit(reading.value, reading.unit, this.settings.units).value, 0);
		}
	}

	private advancePage(slotCount: number): void {
		const pages = this.pageCount(slotCount);
		if (pages > 1 && Date.now() - this.pageStartedAt >= this.settings.cycleMs) {
			this.page += 1;
			this.pageStartedAt = Date.now();
		}
		this.page %= pages;
	}

	private itemFor(slot: InfobarSlot, snapshot: Snapshot | null): ReadingModel {
		const reading = findReading(snapshot, slot.key);
		return toReadingModel(reading, this.series.get(slot.key), {
			label: slot.label || reading?.label || "No data",
			accent: accentFor(reading?.type ?? ReadingType.Other),
			decimals: this.settings.decimals,
			units: this.settings.units,
		});
	}

	private placeholder(): ReadingModel {
		return toReadingModel(undefined, undefined, {
			label: "Select sensors",
			accent: accentFor(ReadingType.Other),
			decimals: this.settings.decimals,
			units: this.settings.units,
		});
	}

	private draw(slots: InfobarSlot[], snapshot: Snapshot | null): void {
		const pageSlots = slots.slice(this.page * this.perPage(), (this.page + 1) * this.perPage());
		const items = pageSlots.length > 0 ? pageSlots.map((slot) => this.itemFor(slot, snapshot)) : [this.placeholder()];
		this.sink.show(
			renderInfobar({
				style: this.settings.style,
				items,
				page: this.page,
				pageCount: this.pageCount(slots.length),
				capacity: HISTORY_CAPACITY,
				font: this.settings.font,
				background: this.settings.background,
			}),
		);
	}
}

@action({ UUID: actionUuid("infobar") })
export class Infobar extends InfobarTileAction {
	protected override createTile(bar: NeoInfobarAction<JsonObject>, raw: JsonObject): LiveTile {
		return new InfobarTile(bar, raw);
	}
}
