import koffi from "koffi";
import { HEADER_SIZE, readHeader, usedLength } from "./layout.js";

const SHARED_MEMORY_NAME = String.raw`Global\HWiNFO_SENS_SM2`;
const FILE_MAP_READ = 0x0004;

const kernel32 = koffi.load("kernel32.dll");
const MemoryBasicInformation = koffi.struct("MEMORY_BASIC_INFORMATION", {
	BaseAddress: "void *",
	AllocationBase: "void *",
	AllocationProtect: "uint32",
	PartitionId: "uint16",
	RegionSize: "size_t",
	State: "uint32",
	Protect: "uint32",
	Type: "uint32",
});

const OpenFileMappingW = kernel32.func("void * __stdcall OpenFileMappingW(uint32 access, int inherit, str16 name)");
const MapViewOfFile = kernel32.func("void * __stdcall MapViewOfFile(void *h, uint32 access, uint32 hi, uint32 lo, size_t bytes)");
const UnmapViewOfFile = kernel32.func("int __stdcall UnmapViewOfFile(void *p)");
const CloseHandle = kernel32.func("int __stdcall CloseHandle(void *h)");
const VirtualQuery = kernel32.func(
	"size_t __stdcall VirtualQuery(void *p, _Out_ MEMORY_BASIC_INFORMATION *info, size_t len)",
);

/** Read-only view over HWiNFO's shared memory. Owns the native handle and mapping. */
export class SharedMemory {
	private handle: unknown = null;
	private view: unknown = null;
	/** Size of the mapped region; header offsets are never trusted to read past it. */
	private regionSize = 0;

	get isOpen(): boolean {
		return this.view !== null;
	}

	/** Returns false when HWiNFO's shared memory is not available. */
	open(): boolean {
		if (this.isOpen) return true;
		const handle = OpenFileMappingW(FILE_MAP_READ, 0, SHARED_MEMORY_NAME);
		if (!handle) return false;
		const view = MapViewOfFile(handle, FILE_MAP_READ, 0, 0, 0);
		if (!view) {
			CloseHandle(handle);
			return false;
		}
		const info: { RegionSize: number | bigint } = {} as never;
		if (VirtualQuery(view, info, koffi.sizeof(MemoryBasicInformation)) === 0) {
			UnmapViewOfFile(view);
			CloseHandle(handle);
			return false;
		}
		this.handle = handle;
		this.view = view;
		this.regionSize = Number(info.RegionSize);
		return true;
	}

	/** Copies the used part of the mapping (header + tables) into a private buffer, so parsing never races HWiNFO. */
	read(): Buffer {
		if (!this.view) throw new Error("shared memory is not open");
		const header = readHeader(this.copy(HEADER_SIZE));
		return this.copy(Math.min(usedLength(header), this.regionSize));
	}

	close(): void {
		if (this.view) UnmapViewOfFile(this.view);
		if (this.handle) CloseHandle(this.handle);
		this.view = null;
		this.handle = null;
		this.regionSize = 0;
	}

	private copy(length: number): Buffer {
		return Buffer.copyBytesFrom(new Uint8Array(koffi.view(this.view, length)));
	}
}
