"use strict";

const MAX_SLOTS = 4;
/** Mirrors SLOT_COLORS in src/render/theme.ts: the default color of each slot. */
const SLOT_COLORS = ["#ff8a3d", "#4f8cff", "#2dd4bf", "#a78bfa"];

let tabs;
let picker;
let color;

const settings = () => PI.state.settings;
const slot = () => settings().slots[tabs.active];
const slotCount = () => clampCount(settings().slotCount, 2, MAX_SLOTS);

/** Makes sure the stored settings always hold MAX_SLOTS well-formed slots. */
function ensureSlots() {
	const stored = Array.isArray(settings().slots) ? settings().slots : [];
	settings().slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({ readingKey: "", label: "", color: "", ...stored[i] }));
}

function showSlot() {
	$("slotLabel").value = slot().label;
	color.sync();
	picker.refresh();
}

PI.start({
	onInit() {
		ensureSlots();
		picker = createSensorPicker($("picker"), {
			getSelected: () => slot().readingKey,
			onSelect(key) {
				slot().readingKey = key;
				PI.saveSettings();
			},
		});
		tabs = createSlotTabs($("tabs"), {
			count: slotCount,
			colorOf: (i) => settings().slots[i].color || SLOT_COLORS[i],
			onSelect: showSlot,
		});
		mountDisplayFields($("fields"), ["decimals", "units", "smoothing", "intervalMs", "background", "font"]);
		$("slotCount").addEventListener("input", () => tabs.select(tabs.active));
		$("slotLabel").addEventListener("input", () => {
			slot().label = $("slotLabel").value;
			PI.saveSettings();
		});
		// The slot color belongs to the active slot, not to a top-level setting, so it is bound by hand.
		color = bindColorField({
			auto: "autoColor",
			input: "color",
			fallback: () => SLOT_COLORS[tabs.active],
			get: () => slot().color,
			set: (value) => {
				slot().color = value;
				tabs.render();
			},
		});
		tabs.select(0);
	},
	...pickerHandlers(() => picker),
});
