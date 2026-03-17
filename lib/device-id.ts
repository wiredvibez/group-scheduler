const KEY = "group_scheduler_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(KEY, created);
    return created;
  } catch {
    // Private mode or storage disabled - use sessionStorage or in-memory fallback
    try {
      const existing = window.sessionStorage.getItem(KEY);
      if (existing) return existing;
      const created = crypto.randomUUID();
      window.sessionStorage.setItem(KEY, created);
      return created;
    } catch {
      return crypto.randomUUID();
    }
  }
}
