/**
 * Byte layout of the header at the start of HWiNFO's shared memory (`HWiNFO_SENS_SM2`).
 * Shared by the parser and the memory reader so both agree on where the tables are.
 */
export const HEADER_SIZE = 44;

export const SIGNATURE_ACTIVE = 0x53695748; // "HWiS" (little-endian)
export const SIGNATURE_DEAD = 0x44414544; // "DEAD"

export interface Header {
	signature: number;
	pollTime: number;
	sensorOffset: number;
	sensorSize: number;
	sensorCount: number;
	readingOffset: number;
	readingSize: number;
	readingCount: number;
}

/** Reads the header fields; `buf` must hold at least HEADER_SIZE bytes. */
export function readHeader(buf: Buffer): Header {
	return {
		signature: buf.readUInt32LE(0),
		pollTime: Number(buf.readBigInt64LE(12)),
		sensorOffset: buf.readUInt32LE(20),
		sensorSize: buf.readUInt32LE(24),
		sensorCount: buf.readUInt32LE(28),
		readingOffset: buf.readUInt32LE(32),
		readingSize: buf.readUInt32LE(36),
		readingCount: buf.readUInt32LE(40),
	};
}

/** Bytes from the start of the mapping to the end of the furthest table, so only that much is copied. */
export function usedLength(header: Header): number {
	const sensorsEnd = header.sensorOffset + header.sensorSize * header.sensorCount;
	const readingsEnd = header.readingOffset + header.readingSize * header.readingCount;
	return Math.max(HEADER_SIZE, sensorsEnd, readingsEnd);
}
