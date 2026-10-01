"use strict";

/** Pre-filled color when the user turns "Auto" off (the temperature accent, the most common pick). */
const DEFAULT_ACCENT = "#ff8a3d";
/** Pre-filled background when the user turns "Default" off. */
const DEFAULT_BACKGROUND_PICK = "#1b2330";

/**
 * Shared form rows for how a key looks and samples. Option lists mirror the allowed values in
 * src/settings/fields.ts and src/settings/display.ts. Rows with `colorSetting` are an "auto" checkbox
 * plus a color input; "" in the setting means automatic.
 */
const DISPLAY_FIELDS = {
	mode: {
		label: "Display",
		control: () => settingSelect("mode", [["both", "Value + graph"], ["text", "Value only"], ["graph", "Graph only"], ["donut", "Ring (donut)"]]),
	},
	graphStyle: {
		label: "Graph",
		control: () => settingSelect("graphStyle", [["smooth", "Smooth line"], ["bars", "Bars"]]),
	},
	label: {
		label: "Label",
		control: () => bindName(element("input", { type: "text", maxLength: 24, placeholder: "Name" }), "label"),
	},
	decimals: {
		label: "Decimals",
		control: () => settingSelect("decimals", [["auto", "Auto"], ["0", "0"], ["1", "1"], ["2", "2"]]),
	},
	gaugeMax: {
		label: "Ring max",
		showWhen: "mode=donut",
		control: () => bindName(element("input", { type: "number", min: "1", step: "any", value: "100", placeholder: "100" }), "gaugeMax"),
	},
	units: {
		label: "Units",
		control: () => settingSelect("units", [["native", "As reported (MB)"], ["gb", "Memory in GB"]]),
	},
	smoothing: {
		label: "Smoothing",
		control() {
			const range = bindName(element("input", { type: "range", min: "0", max: "90", step: "10", value: "0" }), "smoothing");
			const output = element("output");
			output.dataset.outputFor = "smoothing";
			output.dataset.suffix = "%";
			return element("div", { className: "inline" }, [range, output]);
		},
	},
	intervalMs: {
		label: "Update",
		control: () =>
			settingSelect("intervalMs", [[0, "Every poll"], [1000, "1 s"], [2000, "2 s"], [5000, "5 s"], [10000, "10 s"]]),
	},
	color: {
		label: "Color",
		colorSetting: { auto: "autoColor", autoText: " Auto", fallback: DEFAULT_ACCENT },
	},
	background: {
		label: "Background",
		colorSetting: { auto: "autoBackground", autoText: " Default", fallback: DEFAULT_BACKGROUND_PICK },
	},
	alerts: {
		label: "Alerts",
		control: () =>
			element("label", { className: "check" }, [
				bindName(element("input", { type: "checkbox", checked: true }), "alerts"),
				document.createTextNode(" Use threshold rules from Settings"),
			]),
	},
	font: {
		label: "Font",
		control: () =>
			settingSelect("font", ["Segoe UI Variable", "Segoe UI", "Bahnschrift", "Consolas", "Arial"].map((name) => [name, name])),
	},
};

/** Marks a control so bindSettingFields/syncSettingFields read and write it as a setting. */
function bindName(control, setting) {
	control.dataset.setting = setting;
	return control;
}

function settingSelect(setting, options) {
	return bindName(selectControl(options), setting);
}

/** "Auto" checkbox plus color input with the setting's name as the input id. */
function colorControl(setting) {
	const { auto, autoText, fallback } = DISPLAY_FIELDS[setting].colorSetting;
	return element("div", { className: "inline" }, [
		element("label", { className: "check" }, [element("input", { id: auto, type: "checkbox" }), document.createTextNode(autoText)]),
		element("input", { id: setting, type: "color", value: fallback }),
	]);
}

/** Wires a color row to settings[setting]. Returns { sync }. */
function bindColorSetting(setting) {
	const { auto, fallback } = DISPLAY_FIELDS[setting].colorSetting;
	return bindColorField({
		auto,
		input: setting,
		fallback: () => fallback,
		get: () => PI.state.settings[setting] || "",
		set: (value) => (PI.state.settings[setting] = value),
	});
}

function createRow(name) {
	const field = DISPLAY_FIELDS[name];
	const row = fieldRow(field.label, field.colorSetting ? colorControl(name) : field.control());
	if (field.showWhen) row.dataset.showWhen = field.showWhen;
	return row;
}

/**
 * Appends the named rows to the container, then binds and fills every [data-setting] control on the page,
 * including the page's own static ones. Call once from onInit, before page-specific listeners.
 */
function mountDisplayFields(container, names) {
	container.append(...names.map(createRow));
	bindSettingFields();
	const colors = names.filter((name) => DISPLAY_FIELDS[name].colorSetting).map(bindColorSetting);
	syncSettingFields();
	for (const color of colors) color.sync();
}
