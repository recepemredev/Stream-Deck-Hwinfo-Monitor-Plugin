/** Plugin identifier. Must match `UUID` in manifest.json and the `<uuid>.sdPlugin` folder name. */
export const PLUGIN_UUID = "com.recepemredev.hwinfo-monitor";

export type ActionName = "reading" | "composite" | "derived" | "infobar" | "settings";

/** Action identifiers are namespaced under the plugin UUID, as listed in manifest.json. */
export function actionUuid(name: ActionName): string {
	return `${PLUGIN_UUID}.${name}`;
}
