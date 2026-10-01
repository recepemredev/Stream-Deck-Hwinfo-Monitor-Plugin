import { HEADER_SIZE, readHeader, SIGNATURE_ACTIVE, SIGNATURE_DEAD } from "./layout.js";
import { ReadingType, type Reading, type Sensor, type Snapshot } from "./types.js";

const NAME_LEN = 128;
const UNIT_LEN = 16;

const SENSOR_OFFSETS = { id: 0, instance: 4, nameOrig: 8, nameUser: 136, nameUtf8: 264 };
const READING_OFFSETS = {
	type: 0,
	sensorIndex: 4,
	id: 8,
	labelOrig: 12,
	labelUser: 140,
	unit: 268,
	value: 284,
	min: 292,
	max: 300,
	avg: 308,
	labelUtf8: 316,
	unitUtf8: 444,
};

/** The mapped image is not a usable HWiNFO snapshot (HWiNFO stopped, or the data is truncated). */
export class HwinfoFormatError extends Error {}

function readString(buf: Buffer, offset: number, length: number): string {
	const end = buf.indexOf(0, offset);
	const stop = end === -1 || end > offset + length ? offset + length : end;
	return buf.toString("utf8", offset, stop);
}

/** Every offset comes from shared memory, so each table is bounds-checked before it is read. */
function assertRange(buf: Buffer, offset: number, size: number, what: string): void {
	if (offset < 0 || size < 0 || offset + size > buf.length) {
		throw new HwinfoFormatError(`${what} outside mapped region`);
	}
}

/** Prefers the UTF-8 field (HWiNFO v2 layout) and falls back to the ANSI fields. */
function pickText(buf: Buffer, base: number, size: number, fields: { utf8: number; user?: number; orig: number }, length: number): string {
	const candidates = [fields.utf8, fields.user, fields.orig];
	for (const offset of candidates) {
		if (offset === undefined || offset + length > size) continue;
		const text = readString(buf, base + offset, length);
		if (text) return text;
	}
	return "";
}

function parseSensors(buf: Buffer, offset: number, size: number, count: number): Sensor[] {
	assertRange(buf, offset, size * count, "sensor table");
	if (size < SENSOR_OFFSETS.nameUser + NAME_LEN) throw new HwinfoFormatError("sensor element too small");
	const sensors: Sensor[] = [];
	for (let i = 0; i < count; i++) {
		const base = offset + i * size;
		sensors.push({
			id: buf.readUInt32LE(base + SENSOR_OFFSETS.id),
			instance: buf.readUInt32LE(base + SENSOR_OFFSETS.instance),
			name: pickText(buf, base, size, { utf8: SENSOR_OFFSETS.nameUtf8, user: SENSOR_OFFSETS.nameUser, orig: SENSOR_OFFSETS.nameOrig }, NAME_LEN),
		});
	}
	return sensors;
}

function parseReadings(buf: Buffer, offset: number, size: number, count: number, sensors: Sensor[]): Reading[] {
	assertRange(buf, offset, size * count, "reading table");
	if (size < READING_OFFSETS.avg + 8) throw new HwinfoFormatError("reading element too small");
	const readings: Reading[] = [];
	for (let i = 0; i < count; i++) {
		const base = offset + i * size;
		const sensor = sensors[buf.readUInt32LE(base + READING_OFFSETS.sensorIndex)];
		if (!sensor) continue;
		const type = buf.readUInt32LE(base + READING_OFFSETS.type);
		readings.push({
			key: `${sensor.id}:${sensor.instance}:${buf.readUInt32LE(base + READING_OFFSETS.id)}`,
			type: type in ReadingType ? type : ReadingType.Other,
			sensorName: sensor.name,
			label: pickText(buf, base, size, { utf8: READING_OFFSETS.labelUtf8, user: READING_OFFSETS.labelUser, orig: READING_OFFSETS.labelOrig }, NAME_LEN),
			unit: pickText(buf, base, size, { utf8: READING_OFFSETS.unitUtf8, orig: READING_OFFSETS.unit }, UNIT_LEN),
			value: buf.readDoubleLE(base + READING_OFFSETS.value),
			min: buf.readDoubleLE(base + READING_OFFSETS.min),
			max: buf.readDoubleLE(base + READING_OFFSETS.max),
			avg: buf.readDoubleLE(base + READING_OFFSETS.avg),
		});
	}
	return readings;
}

/** Parses a raw HWiNFO shared-memory image. Throws HwinfoFormatError on anything malformed. */
export function parseSnapshot(buf: Buffer): Snapshot {
	assertRange(buf, 0, HEADER_SIZE, "header");
	const header = readHeader(buf);
	if (header.signature === SIGNATURE_DEAD) throw new HwinfoFormatError("HWiNFO is not active");
	if (header.signature !== SIGNATURE_ACTIVE) throw new HwinfoFormatError("bad signature");

	const sensors = parseSensors(buf, header.sensorOffset, header.sensorSize, header.sensorCount);
	const readings = parseReadings(buf, header.readingOffset, header.readingSize, header.readingCount, sensors);
	return { pollTime: header.pollTime, readings };
}
