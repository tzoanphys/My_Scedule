const CHIME_PREFIX = "orbit-focus-chime:";

const listeners = new Set();
let owner = "";
let session = null;
let pendingChime = null;

function digits(value, max) {
  const text = String(value ?? "").replace(/\D/g, "").slice(0, 2);
  if (!text) return "";
  return String(Math.min(max, Number(text)));
}

function asSeconds(hours, minutes) {
  const h = Math.min(23, Math.max(0, Math.floor(Number(hours) || 0)));
  const m = Math.min(59, Math.max(0, Math.floor(Number(minutes) || 0)));
  return h * 3600 + m * 60;
}

function fresh() {
  return {
    mode: "open",
    open: { phase: "idle", startedAt: null, banked: 0 },
    back: {
      phase: "idle",
      startedAt: null,
      left: 25 * 60,
      span: 25 * 60,
      hours: "0",
      minutes: "25",
    },
  };
}

function knownPhase(value, allowed) {
  return allowed.includes(value) ? value : "idle";
}

function sanitize(raw) {
  const next = fresh();
  if (!raw || typeof raw !== "object") return next;
  next.mode = raw.mode === "back" ? "back" : "open";

  const open = raw.open && typeof raw.open === "object" ? raw.open : {};
  const banked = Math.max(0, Number(open.banked) || 0);
  const openStarted = Number(open.startedAt);
  let openPhase = knownPhase(open.phase, ["idle", "running", "paused"]);
  if (openPhase === "running" && !Number.isFinite(openStarted)) openPhase = "paused";
  if (openPhase === "idle") {
    next.open = { phase: "idle", startedAt: null, banked: 0 };
  } else {
    next.open = {
      phase: openPhase,
      startedAt: openPhase === "running" ? openStarted : null,
      banked,
    };
  }

  const back = raw.back && typeof raw.back === "object" ? raw.back : {};
  const hours = digits(back.hours ?? "0", 23);
  const minutes = digits(back.minutes ?? "25", 59);
  const declared = asSeconds(hours, minutes);
  let phase = knownPhase(back.phase, ["idle", "running", "paused", "done"]);
  let left = Math.max(0, Number(back.left) || 0);
  let span = Math.max(0, Number(back.span) || 0);
  let startedAt = Number(back.startedAt);
  if (!Number.isFinite(startedAt)) startedAt = null;
  if (phase === "running" && startedAt == null) phase = left > 0 ? "paused" : "done";
  if (phase === "idle") {
    left = declared;
    span = declared;
    startedAt = null;
  } else if (phase === "done") {
    left = 0;
    startedAt = null;
    if (span <= 0) span = declared;
  } else if (phase === "paused") {
    startedAt = null;
    if (left <= 0) phase = "done";
    if (span < left) span = Math.max(left, declared);
  } else if (span <= 0) {
    span = Math.max(left, declared);
  }
  next.back = { phase, startedAt, left, span, hours, minutes };
  return next;
}

function readRaw() {
  try {
    return JSON.parse(localStorage.getItem(owner) || "null");
  } catch {
    return null;
  }
}

function writeFocus(next) {
  try {
    localStorage.setItem(owner, JSON.stringify(next));
  } catch {
    /* the clock still runs for this visit */
  }
}

function prepare(now) {
  const loaded = sanitize(readRaw());
  let chime = null;
  const back = loaded.back;
  if (back.phase === "running" && back.startedAt != null) {
    const remain = back.left - (now - back.startedAt) / 1000;
    if (remain <= 0) {
      chime = String(back.startedAt);
      loaded.back = { ...back, phase: "done", startedAt: null, left: 0 };
    }
  }
  return { session: loaded, chime };
}

function takeChime(token) {
  if (!token) return false;
  try {
    const key = `${CHIME_PREFIX}${owner}`;
    if (sessionStorage.getItem(key) === token) return false;
    sessionStorage.setItem(key, token);
    return true;
  } catch {
    return true;
  }
}

function ensure(now = Date.now()) {
  if (session) return;
  const prepared = prepare(now);
  session = prepared.session;
  pendingChime = prepared.chime;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next) {
  session = next;
  writeFocus(next);
  emit();
}

function update(recipe) {
  ensure();
  const current = session;
  const next = recipe(current);
  if (next === current) return;
  commit(next);
}

export function bindFocus(username) {
  const key = `orbit-focus:${String(username || "local")}`;
  if (owner === key) return;
  owner = key;
  session = null;
  pendingChime = null;
  ensure();
}

export function getFocus() {
  ensure();
  return session;
}

export function subscribeFocus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function bootChime() {
  ensure();
  const token = pendingChime;
  pendingChime = null;
  if (token) writeFocus(session);
  return takeChime(token);
}

export function chooseFocus(mode) {
  update((current) => {
    if (current.open.phase === "running" || current.back.phase === "running") return current;
    if (mode !== "open" && mode !== "back") return current;
    if (current.mode === mode) return current;
    return { ...current, mode };
  });
}

export function startFocus(now = Date.now()) {
  update((current) => {
    if (current.mode === "open") {
      if (current.open.phase === "running") return current;
      return {
        ...current,
        open: { ...current.open, phase: "running", startedAt: now },
      };
    }
    const back = current.back;
    if (back.phase === "running") return current;
    if (back.phase === "paused" && back.left > 0) {
      return { ...current, back: { ...back, phase: "running", startedAt: now } };
    }
    const span = asSeconds(back.hours, back.minutes);
    if (span <= 0) return current;
    return {
      ...current,
      back: { ...back, phase: "running", startedAt: now, left: span, span },
    };
  });
}

export function pauseFocus(now = Date.now()) {
  ensure();
  const current = session;
  if (current.mode === "back" && current.back.phase === "running" && current.back.startedAt != null) {
    const left = current.back.left - (now - current.back.startedAt) / 1000;
    if (left <= 0) return tickFocus(now);
  }
  update((latest) => {
    if (latest.mode === "open") {
      if (latest.open.phase !== "running" || latest.open.startedAt == null) return latest;
      const banked = latest.open.banked + Math.max(0, (now - latest.open.startedAt) / 1000);
      return { ...latest, open: { phase: "paused", startedAt: null, banked } };
    }
    const back = latest.back;
    if (back.phase !== "running" || back.startedAt == null) return latest;
    const left = Math.max(0, back.left - (now - back.startedAt) / 1000);
    if (left <= 0) return latest;
    return { ...latest, back: { ...back, phase: "paused", startedAt: null, left } };
  });
  return false;
}

export function resetFocus() {
  update((current) => {
    if (current.mode === "open") {
      return { ...current, open: { phase: "idle", startedAt: null, banked: 0 } };
    }
    const span = asSeconds(current.back.hours, current.back.minutes);
    return {
      ...current,
      back: { ...current.back, phase: "idle", startedAt: null, left: span, span },
    };
  });
}

export function setFocusLength(part, value) {
  update((current) => {
    if (current.back.phase === "running") return current;
    if (part !== "hours" && part !== "minutes") return current;
    const back = {
      ...current.back,
      [part]: digits(value, part === "hours" ? 23 : 59),
    };
    const span = asSeconds(back.hours, back.minutes);
    return {
      ...current,
      back: { ...back, phase: "idle", startedAt: null, left: span, span },
    };
  });
}

export function tickFocus(now = Date.now()) {
  ensure();
  const current = session;
  const back = current.back;
  if (back.phase !== "running" || back.startedAt == null) return false;
  const remain = back.left - (now - back.startedAt) / 1000;
  if (remain > 0) return false;
  const token = String(back.startedAt);
  commit({
    ...current,
    back: { ...back, phase: "done", startedAt: null, left: 0 },
  });
  return takeChime(token);
}

export function focusSeconds(snapshot, now = Date.now()) {
  if (snapshot.mode === "open") {
    const open = snapshot.open;
    if (open.phase === "running" && open.startedAt != null) {
      return open.banked + Math.max(0, (now - open.startedAt) / 1000);
    }
    return open.banked;
  }
  const back = snapshot.back;
  if (back.phase === "done") return 0;
  if (back.phase === "running" && back.startedAt != null) {
    return Math.max(0, back.left - (now - back.startedAt) / 1000);
  }
  return Math.max(0, back.left);
}
