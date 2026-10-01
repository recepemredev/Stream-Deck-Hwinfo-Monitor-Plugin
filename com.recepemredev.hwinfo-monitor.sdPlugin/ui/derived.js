"use strict";

const MAX_READINGS = 8;
const MAX_PRESETS = 20;

let editor;

const settings = () => PI.state.settings;
const presets = () => (PI.state.globals.presets ||= []);
const readingCount = () => clampCount(settings().readingCount, 2, MAX_READINGS);

function renderPresets() {
	const list = presets().filter((preset) => typeof preset?.name === "string");
	$("preset").replaceChildren(...list.map((preset) => new Option(preset.name, preset.id)));
	$("load-preset").disabled = $("delete-preset").disabled = list.length === 0;
}

function selectedPreset() {
	return presets().find((preset) => preset.id === $("preset").value);
}

/** Saves the current operation and readings under a name; an existing preset with that name is replaced. */
function savePreset() {
	const name = $("preset-name").value.trim().slice(0, 24) || `Preset ${presets().length + 1}`;
	const existing = presets().find((preset) => preset.name === name);
	const entry = {
		id: existing?.id ?? crypto.randomUUID(),
		name,
		operation: settings().operation ?? "sum",
		readingCount: readingCount(),
		readingKeys: [...settings().readingKeys],
	};
	PI.state.globals.presets = existing
		? presets().map((preset) => (preset === existing ? entry : preset))
		: [...presets(), entry].slice(-MAX_PRESETS);
	PI.saveGlobals();
	renderPresets();
	$("preset").value = entry.id;
	$("preset-name").value = "";
}

function loadPreset() {
	const preset = selectedPreset();
	if (!preset) return;
	settings().operation = preset.operation;
	settings().readingCount = preset.readingCount;
	settings().readingKeys = preset.readingKeys;
	editor.ensureKeys();
	PI.saveSettings();
	syncSettingFields();
	editor.tabs.select(0);
}

function deletePreset() {
	const preset = selectedPreset();
	if (!preset) return;
	PI.state.globals.presets = presets().filter((p) => p !== preset);
	PI.saveGlobals();
	renderPresets();
}

PI.start({
	onInit() {
		editor = createKeyListEditor({ tabsContainer: $("tabs"), pickerContainer: $("picker"), size: MAX_READINGS, count: readingCount });
		mountDisplayFields($("fields"), ["mode", "graphStyle", "label", "gaugeMax", "decimals", "units", "smoothing", "intervalMs", "color", "background", "font"]);
		$("readingCount").addEventListener("input", () => editor.tabs.select(editor.tabs.active));
		$("save-preset").addEventListener("click", savePreset);
		$("load-preset").addEventListener("click", loadPreset);
		$("delete-preset").addEventListener("click", deletePreset);
		editor.tabs.select(0);
		renderPresets();
	},
	...pickerHandlers(() => editor.picker),
	onGlobals() {
		editor.picker.refresh();
		renderPresets();
	},
});
