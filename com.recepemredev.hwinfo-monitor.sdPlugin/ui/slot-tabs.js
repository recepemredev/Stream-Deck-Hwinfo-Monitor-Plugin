"use strict";

/**
 * Numbered tabs, one per slot. `count()` is how many tabs show, `colorOf(i)` optionally gives a dot color,
 * `onSelect(index)` runs after the active tab changes.
 */
function createSlotTabs(container, { count, colorOf, onSelect }) {
	let active = 0;

	function createTab(index) {
		const children = [];
		if (colorOf) {
			const dot = element("span", { className: "dot" });
			dot.style.background = colorOf(index);
			children.push(dot);
		}
		children.push(document.createTextNode(String(index + 1)));
		const tab = element("button", { type: "button", className: "tab" + (index === active ? " active" : "") }, children);
		tab.addEventListener("click", () => select(index));
		return tab;
	}

	function render() {
		container.replaceChildren(...Array.from({ length: count() }, (_, i) => createTab(i)));
	}

	function select(index) {
		active = Math.min(index, count() - 1);
		render();
		onSelect(active);
	}

	return {
		render,
		select,
		get active() {
			return active;
		},
	};
}

/**
 * Tabs plus a sensor picker that edit `settings.readingKeys` (a fixed-size array; "" = unset).
 * `count()` says how many tabs are in use; `onTabSelect(index)` (optional) runs after the active tab changes.
 */
function createKeyListEditor({ tabsContainer, pickerContainer, size, count, onTabSelect }) {
	const keys = () => PI.state.settings.readingKeys;

	function ensureKeys() {
		PI.state.settings.readingKeys = fixedStrings(keys(), size);
	}

	ensureKeys();
	let tabs;
	const picker = createSensorPicker(pickerContainer, {
		getSelected: () => keys()[tabs.active],
		onSelect(key) {
			keys()[tabs.active] = key;
			PI.saveSettings();
		},
	});
	tabs = createSlotTabs(tabsContainer, {
		count,
		onSelect(index) {
			picker.refresh();
			onTabSelect?.(index);
		},
	});
	return { picker, tabs, ensureKeys };
}
