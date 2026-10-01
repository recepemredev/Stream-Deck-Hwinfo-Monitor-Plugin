/** Reading categories, numbered as in HWiNFO's shared-memory `SENSOR_READING_TYPE`. */
export enum ReadingType {
	None = 0,
	Temperature = 1,
	Voltage = 2,
	Fan = 3,
	Current = 4,
	Power = 5,
	Clock = 6,
	Usage = 7,
	Other = 8,
}

export interface Sensor {
	id: number;
	instance: number;
	name: string;
}

export interface Reading {
	/** Stable key: sensorId:instance:readingId. */
	key: string;
	type: ReadingType;
	sensorName: string;
	label: string;
	unit: string;
	value: number;
	min: number;
	max: number;
	avg: number;
}

/** Every reading HWiNFO published in one poll. */
export interface Snapshot {
	pollTime: number;
	readings: Reading[];
}

export function findReading(snapshot: Snapshot | null, key: string): Reading | undefined {
	return snapshot?.readings.find((r) => r.key === key);
}
