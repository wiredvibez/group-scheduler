const KEY = "group_scheduler_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(KEY, created);
  return created;
}
