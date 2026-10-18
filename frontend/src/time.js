export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const TONES = ["", "teal", "gold", "", "teal", "gold", ""];
export const ICONS = ["saturn", "moon", "star", "comet", "rocket", "sun", "planet"];

export function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDaysISO(iso, days) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function formatDay(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const whole = Math.ceil(safe - 1e-9);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return [hours, minutes, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatSpoken(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0 && minutes === 0) return "0 minutes";
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  if (hours === 0) return minuteLabel;
  if (minutes === 0) return hourLabel;
  return `${hourLabel} ${minuteLabel}`;
}

export function liveElapsed(day, now = Date.now(), skew = 0) {
  const target = Number(day.targetSeconds) || 4 * 60 * 60;
  let elapsed = Number(day.elapsedSeconds) || 0;
  if (day.running && day.runningSince) {
    const since = Date.parse(day.runningSince);
    if (!Number.isNaN(since)) {
      const delta = (now + skew - since) / 1000;
      if (delta > 0 && delta <= 30) elapsed += delta;
    }
  }
  return Math.min(target, Math.max(0, elapsed));
}

export function cardStatus(day, now, skew) {
  if (day.completed) return { text: "Complete", kind: "is-done" };
  const target = Number(day.targetSeconds) || 4 * 60 * 60;
  const left = formatClock(target - liveElapsed(day, now, skew));
  if (day.running) return { text: left, kind: "is-run" };
  const elapsed = Number(day.elapsedSeconds) || 0;
  if (elapsed > 0) return { text: `${left} paused`, kind: "" };
  return { text: left, kind: "" };
}
