/** Edge length of a Stream Deck key image in pixels. */
export const KEY_SIZE = 144;

/** Used when the chosen font is missing on the PC. */
const FALLBACK_FONTS = "'Segoe UI', sans-serif";

export function escapeXml(text: string): string {
	return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function toDataUri(svg: string): string {
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_BACKGROUND_TOP = "#171d26";
const DEFAULT_BACKGROUND_BOTTOM = "#0b0f14";
const BACKGROUND_LIGHTEN = 0.1;
const BACKGROUND_DARKEN = 0.3;

/** Moves each channel of a #rrggbb color toward `target` (0 = black, 255 = white) by `amount` (0-1). */
function shade(hex: string, target: number, amount: number): string {
	const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const mixed = channels.map((c) => Math.round(c + (target - c) * amount));
	return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Vertical gradient used behind every key; reference it as fill="url(#bg)". Declare inside <defs>.
 * `color` is a #rrggbb tone (lightened at the top, darkened at the bottom); "" gives the default dark look.
 */
export function backgroundDef(color = ""): string {
	const top = color ? shade(color, 255, BACKGROUND_LIGHTEN) : DEFAULT_BACKGROUND_TOP;
	const bottom = color ? shade(color, 0, BACKGROUND_DARKEN) : DEFAULT_BACKGROUND_BOTTOM;
	return `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}

export interface SvgFrame {
	width: number;
	height: number;
	font: string;
	/** Background tone as #rrggbb, or "" for the default dark gradient. */
	background: string;
	/** Extra gradient definitions the body references. */
	defs?: string;
}

/** Wraps a drawing in the root element every surface shares: size, font stack and background. */
export function svgDocument(frame: SvgFrame, body: string): string {
	const { width, height } = frame;
	const font = `'${escapeXml(frame.font)}', ${FALLBACK_FONTS}`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${font}">`
		+ `<defs>${backgroundDef(frame.background)}${frame.defs ?? ""}</defs>`
		+ `<rect width="${width}" height="${height}" fill="url(#bg)"/>`
		+ body
		+ `</svg>`;
}
