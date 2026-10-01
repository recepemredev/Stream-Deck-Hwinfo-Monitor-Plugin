"use strict";

const MAX_RULES = 20;
const SNOOZES = [
	[300000, "5 minutes"],
	[900000, "15 minutes"],
	[3600000, "1 hour"],
	[0, "Until resumed"],
];
const NEW_RULE = {
	readingType: 1,
	comparison: "above",
	value: 85,
	hysteresis: 3,
	dwellMs: 2000,
	cooldownMs: 0,
	sticky: false,
	snoozeMs: 300000,
	color: "#ff4d4f",
	text: "",
};

const rules = () => (PI.state.globals.thresholds ||= []);

function save() {
	PI.saveGlobals();
}

function select(options, current, onChange) {
	const node = selectControl(options);
	node.value = String(current);
	node.addEventListener("change", () => onChange(node.value));
	return node;
}

function input(type, current, onChange, props = {}) {
	const node = element("input", { type, ...props });
	if (type === "checkbox") node.checked = Boolean(current);
	else node.value = String(current);
	node.addEventListener("input", () => onChange(type === "checkbox" ? node.checked : node.value));
	return node;
}

/** Numeric field; ignores empty or invalid input instead of saving NaN. */
function numberInput(current, onChange, props = {}) {
	return input("number", current, (raw) => {
		if (raw !== "" && Number.isFinite(Number(raw))) onChange(Number(raw));
	}, props);
}

function update(rule, key, value) {
	rule[key] = value;
	save();
}

function createRuleCard(rule) {
	const remove = element("button", { type: "button", className: "button danger", textContent: "Remove" });
	remove.addEventListener("click", () => {
		PI.state.globals.thresholds = rules().filter((r) => r.id !== rule.id);
		save();
		renderRules();
	});

	return element("div", { className: "card" }, [
		fieldRow("Sensor type", select(READING_TYPES, rule.readingType, (v) => update(rule, "readingType", Number(v)))),
		fieldRow("Trigger when", select([["above", "At or above"], ["below", "At or below"]], rule.comparison, (v) => update(rule, "comparison", v))),
		fieldRow("Value", numberInput(rule.value, (v) => update(rule, "value", v), { step: "any" })),
		fieldRow("Hysteresis", numberInput(rule.hysteresis, (v) => update(rule, "hysteresis", Math.max(0, v)), { step: "any", min: "0" })),
		fieldRow("Dwell (s)", numberInput(rule.dwellMs / 1000, (v) => update(rule, "dwellMs", Math.max(0, v) * 1000), { step: "any", min: "0" })),
		fieldRow("Cooldown (s)", numberInput(rule.cooldownMs / 1000, (v) => update(rule, "cooldownMs", Math.max(0, v) * 1000), { step: "any", min: "0" })),
		fieldRow("Sticky", element("label", { className: "check" }, [
			input("checkbox", rule.sticky, (v) => update(rule, "sticky", v)),
			document.createTextNode(" Stay until key is pressed"),
		])),
		fieldRow("Snooze", select(SNOOZES, rule.snoozeMs, (v) => update(rule, "snoozeMs", Number(v)))),
		fieldRow("Color", input("color", rule.color, (v) => update(rule, "color", v))),
		fieldRow("Text", input("text", rule.text, (v) => update(rule, "text", v), { maxLength: 24, placeholder: "{value}{unit} - optional label" })),
		element("div", { className: "card-actions" }, [remove]),
	]);
}

function renderRules() {
	$("rules").replaceChildren(...rules().map(createRuleCard));
	$("add-rule").disabled = rules().length >= MAX_RULES;
}

function addRule() {
	rules().push({ ...NEW_RULE, id: crypto.randomUUID() });
	save();
	renderRules();
}

PI.start({
	onInit() {
		$("add-rule").addEventListener("click", addRule);
		$("pollMs").addEventListener("change", () => {
			PI.state.globals.pollMs = Number($("pollMs").value);
			save();
		});
	},
	onGlobals() {
		$("pollMs").value = String(PI.state.globals.pollMs ?? 1000);
		renderRules();
	},
});
