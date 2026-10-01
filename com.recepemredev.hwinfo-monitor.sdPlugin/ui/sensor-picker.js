"use strict";

const CATEGORIES = [["all", "All"], ["favorites", "Favorites"], ...READING_TYPES.map(([value, name]) => [String(value), name])];
const RETRY_MS = 2000;

/**
 * Searchable sensor list with category filter and favorites (stored in global settings).
 * `getSelected()` returns the highlighted reading key; `onSelect(key)` is called on click.
 * Wire the returned handlers into PI.start: requestReadings (onOpen), handleMessage (onPluginMessage),
 * refresh (onGlobals).
 */
function createSensorPicker(container, { getSelected, onSelect }) {
	let readings = [];
	let retryTimer;

	const search = element("input", { type: "search", placeholder: "Search sensors", autocomplete: "off" });
	const category = element("select", { ariaLabel: "Category" });
	for (const [value, name] of CATEGORIES) category.add(new Option(name, value));
	const list = element("div", { className: "list", ariaLabel: "Sensors" });
	list.setAttribute("role", "listbox");
	const status = element("div", { className: "hint" });
	container.append(element("div", { className: "picker-tools" }, [search, category]), list, status);

	const favorites = () => (Array.isArray(PI.state.globals.favorites) ? PI.state.globals.favorites : []);

	function toggleFavorite(key) {
		const current = favorites();
		PI.state.globals.favorites = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
		PI.saveGlobals();
		render();
	}

	function matches(reading) {
		if (category.value === "favorites" && !favorites().includes(reading.key)) return false;
		if (!["all", "favorites"].includes(category.value) && String(reading.type) !== category.value) return false;
		const needle = search.value.trim().toLowerCase();
		return !needle || `${reading.label} ${reading.sensor}`.toLowerCase().includes(needle);
	}

	function createStar(reading) {
		const isFavorite = favorites().includes(reading.key);
		const star = element("button", {
			type: "button",
			className: "star" + (isFavorite ? " on" : ""),
			textContent: isFavorite ? "★" : "☆",
			title: "Favorite",
		});
		star.addEventListener("click", (event) => {
			event.stopPropagation();
			toggleFavorite(reading.key);
		});
		return star;
	}

	function createItem(reading) {
		const item = element("div", { className: "item" + (reading.key === getSelected() ? " selected" : "") }, [
			element("div", { className: "item-text" }, [
				element("div", { className: "item-label", textContent: reading.label }),
				element("div", { className: "item-sensor", textContent: reading.sensor }),
			]),
			element("span", { className: "item-unit", textContent: reading.unit }),
			createStar(reading),
		]);
		item.setAttribute("role", "option");
		item.addEventListener("click", () => {
			onSelect(reading.key);
			render();
		});
		return item;
	}

	function render() {
		const visible = readings.filter(matches);
		list.replaceChildren(...visible.map(createItem));
		status.textContent = readings.length === 0
			? "HWiNFO not detected. Start HWiNFO with Sensors and Shared Memory enabled."
			: `${visible.length} of ${readings.length} readings`;
		list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
	}

	function requestReadings() {
		clearTimeout(retryTimer);
		PI.sendToPlugin({ event: "getReadings" });
	}

	search.addEventListener("input", render);
	category.addEventListener("change", render);

	return {
		requestReadings,
		refresh: render,
		handleMessage(payload) {
			if (payload?.event !== "readings") return;
			readings = payload.readings;
			render();
			if (readings.length === 0) retryTimer = setTimeout(requestReadings, RETRY_MS);
		},
	};
}

/**
 * PI.start handlers that keep a picker fed: ask for readings once connected, redraw when favorites change,
 * and take the plugin's reply. `getPicker` is called lazily because pickers are created in onInit.
 */
function pickerHandlers(getPicker) {
	return {
		onOpen: () => getPicker().requestReadings(),
		onGlobals: () => getPicker().refresh(),
		onPluginMessage: (payload) => getPicker().handleMessage(payload),
	};
}
