"use strict";

const MAX_READINGS = 8;

let editor;

const settings = () => PI.state.settings;
const readingCount = () => clampCount(settings().readingCount, 1, MAX_READINGS);

/** Makes sure the stored settings always hold MAX_READINGS custom labels ("" = use the sensor's name). */
function ensureLabels() {
	settings().readingLabels = fixedStrings(settings().readingLabels, MAX_READINGS);
}

function showLabel(index) {
	$("readingLabel").value = settings().readingLabels[index];
}

PI.start({
	onInit() {
		ensureLabels();
		editor = createKeyListEditor({
			tabsContainer: $("tabs"),
			pickerContainer: $("picker"),
			size: MAX_READINGS,
			count: readingCount,
			onTabSelect: showLabel,
		});
		mountDisplayFields($("fields"), ["decimals", "units", "background", "font"]);
		$("readingCount").addEventListener("input", () => editor.tabs.select(editor.tabs.active));
		$("readingLabel").addEventListener("input", () => {
			settings().readingLabels[editor.tabs.active] = $("readingLabel").value;
			PI.saveSettings();
		});
		editor.tabs.select(0);
	},
	...pickerHandlers(() => editor.picker),
});
