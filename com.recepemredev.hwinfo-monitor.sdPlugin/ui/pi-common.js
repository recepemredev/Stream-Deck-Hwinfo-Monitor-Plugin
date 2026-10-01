"use strict";

/** Shared Stream Deck Property Inspector plumbing: socket, settings, global settings, form helpers. */
const $ = (id) => document.getElementById(id);

/** HWiNFO reading types (src/hwinfo/types.ts ReadingType), as [value, name]; "None" (0) is never offered. */
const READING_TYPES = [
	[1, "Temperature"],
	[2, "Voltage"],
	[3, "Fan"],
	[4, "Current"],
	[5, "Power"],
	[6, "Clock"],
	[7, "Usage"],
	[8, "Other"],
];

function element(tag, props = {}, children = []) {
	const node = Object.assign(document.createElement(tag), props);
	node.append(...children);
	return node;
}

function fieldRow(labelText, control) {
	return element("div", { className: "field" }, [element("label", { textContent: labelText }), control]);
}

function selectControl(options, props = {}) {
	const node = element("select", props);
	for (const [value, name] of options) node.add(new Option(name, String(value)));
	return node;
}

const PI = (() => {
	const state = { settings: {}, globals: {} };
	let socket;
	let uuid;
	let actionUUID;
	let globalsLoaded = false;

	const send = (message) => socket.send(JSON.stringify(message));

	return {
		state,
		saveSettings: () => send({ event: "setSettings", context: uuid, payload: state.settings }),
		saveGlobals: () => send({ event: "setGlobalSettings", context: uuid, payload: state.globals }),
		sendToPlugin: (payload) => send({ action: actionUUID, event: "sendToPlugin", context: uuid, payload }),

		/**
		 * Connects to Stream Deck. Handlers: onInit() once settings are known, onOpen() after the socket
		 * is registered, onGlobals() when global settings arrive, onPluginMessage(payload) for plugin replies.
		 */
		start({ onInit, onOpen, onGlobals, onPluginMessage }) {
			window.connectElgatoStreamDeckSocket = (port, inUUID, registerEvent, _info, actionInfo) => {
				uuid = inUUID;
				const info = JSON.parse(actionInfo);
				actionUUID = info.action;
				state.settings = info.payload.settings || {};
				onInit?.();

				socket = new WebSocket(`ws://127.0.0.1:${port}`);
				socket.addEventListener("open", () => {
					send({ event: registerEvent, uuid });
					send({ event: "getGlobalSettings", context: uuid });
					onOpen?.();
				});
				socket.addEventListener("message", (event) => {
					const message = JSON.parse(event.data);
					if (message.event === "didReceiveGlobalSettings") {
						// Only the first response is read; later ones are echoes of our own saves and would
						// replace objects the page still edits.
						if (globalsLoaded) return;
						globalsLoaded = true;
						state.globals = message.payload.settings || {};
						onGlobals?.();
					} else if (message.event === "sendToPropertyInspector") {
						onPluginMessage?.(message.payload);
					}
				});
			};
		},
	};
})();

function readControl(control) {
	if (control.type === "checkbox") return control.checked;
	return control.type === "range" ? Number(control.value) : control.value;
}

/** Shows the current value next to controls that declare <output data-output-for="setting" data-suffix="%">. */
function updateOutputs() {
	for (const output of document.querySelectorAll("[data-output-for]")) {
		output.textContent = `${PI.state.settings[output.dataset.outputFor] ?? 0}${output.dataset.suffix ?? ""}`;
	}
}

/** Shows rows marked data-show-when="setting=value" only while that control has that value. */
function updateConditionalRows() {
	for (const row of document.querySelectorAll("[data-show-when]")) {
		const [setting, expected] = row.dataset.showWhen.split("=");
		row.hidden = document.querySelector(`[data-setting="${setting}"]`)?.value !== expected;
	}
}

/** Pushes saved settings into every [data-setting] control. */
function syncSettingFields() {
	for (const control of document.querySelectorAll("[data-setting]")) {
		const value = PI.state.settings[control.dataset.setting];
		if (value === undefined) continue;
		if (control.type === "checkbox") control.checked = Boolean(value);
		else control.value = String(value);
	}
	updateOutputs();
	updateConditionalRows();
}

/** Saves every [data-setting] control into PI.state.settings whenever it changes. */
function bindSettingFields() {
	for (const control of document.querySelectorAll("[data-setting]")) {
		control.addEventListener("input", () => {
			PI.state.settings[control.dataset.setting] = readControl(control);
			updateOutputs();
			updateConditionalRows();
			PI.saveSettings();
		});
	}
}

/**
 * "Auto" checkbox + color input. `get` returns the stored color ("" = auto), `set` stores a new one.
 * Returns { sync } to refresh the controls after the target changes.
 */
function bindColorField({ auto, input, fallback, get, set }) {
	const sync = () => {
		const color = get();
		$(auto).checked = !color;
		$(input).disabled = !color;
		$(input).value = color || fallback();
	};
	$(auto).addEventListener("change", () => {
		set($(auto).checked ? "" : $(input).value);
		$(input).disabled = $(auto).checked;
		PI.saveSettings();
	});
	$(input).addEventListener("input", () => {
		set($(input).value);
		PI.saveSettings();
	});
	return { sync };
}
