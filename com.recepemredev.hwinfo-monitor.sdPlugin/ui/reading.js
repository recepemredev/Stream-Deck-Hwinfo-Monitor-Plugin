"use strict";

const settings = () => PI.state.settings;

let picker;

PI.start({
	onInit() {
		picker = createSensorPicker($("picker"), {
			getSelected: () => settings().readingKey,
			onSelect(key) {
				settings().readingKey = key;
				PI.saveSettings();
			},
		});
		mountDisplayFields($("fields"), ["mode", "graphStyle", "label", "gaugeMax", "decimals", "units", "smoothing", "intervalMs", "color", "background", "alerts", "font"]);
	},
	...pickerHandlers(() => picker),
});
