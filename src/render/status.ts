import { KEY_SIZE, svgDocument } from "./svg.js";
import { DEFAULT_FONT, LABEL, MUTED } from "./theme.js";
const LIVE = "#34d399";
const WAITING = "#f59e0b";

export interface StatusModel {
	connected: boolean;
	readingCount: number;
	pollMs: number;
}

function formatPoll(pollMs: number): string {
	return pollMs < 1000 ? `${pollMs} ms` : `${pollMs / 1000} s`;
}

/** Renders the connection status key as a 144x144 SVG. */
export function renderStatusTile(model: StatusModel): string {
	const color = model.connected ? LIVE : WAITING;
	const title = model.connected ? "Live" : "Waiting";
	const detail = model.connected ? `${model.readingCount} readings · ${formatPoll(model.pollMs)}` : "Start HWiNFO";
	return svgDocument(
		{ width: KEY_SIZE, height: KEY_SIZE, font: DEFAULT_FONT, background: "" },
		`<text x="72" y="26" fill="${LABEL}" font-size="17" font-weight="600" text-anchor="middle">HWiNFO</text>`
			+ `<circle cx="72" cy="56" r="16" fill="${color}" fill-opacity="0.2"/>`
			+ `<circle cx="72" cy="56" r="8" fill="${color}"/>`
			+ `<text x="72" y="100" fill="#ffffff" font-size="28" font-weight="700" text-anchor="middle">${title}</text>`
			+ `<text x="72" y="126" fill="${MUTED}" font-size="13" text-anchor="middle">${detail}</text>`,
	);
}
