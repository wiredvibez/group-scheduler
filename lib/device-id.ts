const KEY = "group_scheduler_device_id";

function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older Safari (pre-15.4) and other environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const created = randomUUID();
    window.localStorage.setItem(KEY, created);
    return created;
  } catch {
    // Private mode or storage disabled - use sessionStorage or in-memory fallback
    try {
      const existing = window.sessionStorage.getItem(KEY);
      if (existing) return existing;
      const created = randomUUID();
      window.sessionStorage.setItem(KEY, created);
      return created;
    } catch {
      return randomUUID();
    }
  }
}
