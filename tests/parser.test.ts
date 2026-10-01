import assert from "node:assert/strict";
import { test } from "node:test";
import { HEADER_SIZE, readHeader, SIGNATURE_DEAD, usedLength } from "../src/hwinfo/layout.js";
import { HwinfoFormatError, parseSnapshot } from "../src/hwinfo/parser.js";
import { ReadingType } from "../src/hwinfo/types.js";

const SENSOR_SIZE = 392;
const READING_SIZE = 460;

function buildImage(signature = 0x53695748): Buffer {
	const sensorOffset = 44;
	const readingOffset = sensorOffset + SENSOR_SIZE;
	const buf = Buffer.alloc(readingOffset + READING_SIZE);
	buf.writeUInt32LE(signature, 0);
	buf.writeUInt32LE(sensorOffset, 20);
	buf.writeUInt32LE(SENSOR_SIZE, 24);
	buf.writeUInt32LE(1, 28);
	buf.writeUInt32LE(readingOffset, 32);
	buf.writeUInt32LE(READING_SIZE, 36);
	buf.writeUInt32LE(1, 40);
	buf.writeUInt32LE(0xabc, sensorOffset);
	buf.write("CPU [#0]", sensorOffset + 264);
	buf.writeUInt32LE(ReadingType.Temperature, readingOffset);
	buf.writeUInt32LE(0, readingOffset + 4);
	buf.writeUInt32LE(7, readingOffset + 8);
	buf.write("CPU Package", readingOffset + 316);
	buf.write("°C", readingOffset + 444);
	buf.writeDoubleLE(55.5, readingOffset + 284);
	return buf;
}

test("parses a valid image", () => {
	const { readings } = parseSnapshot(buildImage());
	assert.equal(readings.length, 1);
	assert.equal(readings[0].key, "2748:0:7");
	assert.equal(readings[0].label, "CPU Package");
	assert.equal(readings[0].sensorName, "CPU [#0]");
	assert.equal(readings[0].unit, "°C");
	assert.equal(readings[0].value, 55.5);
});

test("rejects a bad signature", () => {
	assert.throws(() => parseSnapshot(buildImage(0x12345678)), HwinfoFormatError);
});

test("rejects tables that exceed the mapped region", () => {
	assert.throws(() => parseSnapshot(buildImage().subarray(0, 300)), HwinfoFormatError);
});

test("rejects an image HWiNFO marked as closed", () => {
	assert.throws(() => parseSnapshot(buildImage(SIGNATURE_DEAD)), /not active/);
});

test("used length covers the furthest table", () => {
	const header = readHeader(buildImage());
	assert.equal(usedLength(header), 44 + SENSOR_SIZE + READING_SIZE);
	assert.equal(usedLength({ ...header, sensorOffset: 0, sensorCount: 0, readingOffset: 0, readingCount: 0 }), HEADER_SIZE);
});
