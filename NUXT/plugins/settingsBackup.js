import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const BACKUP_SCHEME = "VueTube Backup";
const SCHEMA_VERSION = 1;
const HISTORY_KEY = "historyVideos";

// Device-specific cache, never exported and never overwritten on restore
const EXCLUDED_KEYS = ["baseJsVersion", "lastRunVersion"];
// Survive a restore even if the backup does not contain them
const KEPT_KEYS = [...EXCLUDED_KEYS, "firstTimeSetupComplete"];

export function buildBackup({ includeHistory = true, version, channel } = {}) {
  const registry = {};
  for (const key of Object.keys(localStorage)) {
    if (EXCLUDED_KEYS.includes(key)) continue;
    if (!includeHistory && key === HISTORY_KEY) continue;
    registry[key] = localStorage.getItem(key);
  }
  return {
    scheme: BACKUP_SCHEME,
    schemaVersion: SCHEMA_VERSION,
    version,
    channel,
    date: Date.now(),
    includesHistory: includeHistory,
    registry,
  };
}

// Accepts the current format ({ key: value }) and the legacy one ([{ key, value }])
export function parseBackup(text) {
  const invalid = () => new Error("Invalid backup file");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw invalid();
  }
  if (!data || data.scheme !== BACKUP_SCHEME) throw invalid();

  let entries;
  if (Array.isArray(data.registry)) {
    entries = data.registry.map((e) => [e && e.key, e && e.value]);
  } else if (data.registry && typeof data.registry === "object") {
    entries = Object.entries(data.registry);
  } else {
    throw invalid();
  }

  const registry = {};
  for (const [key, value] of entries) {
    if (typeof key !== "string" || typeof value !== "string") continue;
    if (EXCLUDED_KEYS.includes(key)) continue;
    registry[key] = value;
  }
  if (!Object.keys(registry).length) throw invalid();

  return {
    version: data.version,
    channel: data.channel,
    date: data.date,
    includesHistory:
      typeof data.includesHistory === "boolean"
        ? data.includesHistory
        : HISTORY_KEY in registry,
    registry,
  };
}

// Replaces the whole localStorage with the backup, rolls back on failure
export function applyBackup(parsed) {
  const snapshot = {};
  for (const key of Object.keys(localStorage)) {
    snapshot[key] = localStorage.getItem(key);
  }

  const kept = {};
  for (const key of KEPT_KEYS) {
    if (key in snapshot) kept[key] = snapshot[key];
  }
  // A backup made without history must not wipe the current one
  if (!parsed.includesHistory && HISTORY_KEY in snapshot) {
    kept[HISTORY_KEY] = snapshot[HISTORY_KEY];
  }

  try {
    localStorage.clear();
    for (const [key, value] of Object.entries({ ...parsed.registry, ...kept })) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    localStorage.clear();
    for (const [key, value] of Object.entries(snapshot)) {
      localStorage.setItem(key, value);
    }
    throw e;
  }
}

export async function exportBackup(options) {
  const json = JSON.stringify(buildBackup(options), null, 2);
  const fileName = `vuetube-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: fileName, url: uri, dialogTitle: fileName });
}
