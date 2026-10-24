// localStorage can be unavailable (private mode, quota): every value kept here is a convenience,
// so a failed read is the default and a failed write is dropped.

export function loadString(key: string) {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveString(key: string, value: string) {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // The value is a convenience only.
  }
}

export function loadJson(key: string): unknown {
  const raw = loadString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown) {
  saveString(key, JSON.stringify(value));
}
