async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    if (response.status === 401 && !options.quietAuth) {
      window.dispatchEvent(new Event("orbit-signed-out"));
    }
    const error = new Error(data && data.error ? data.error : `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (data && typeof data === "object" && data.serverNow) {
    data.skew = Date.parse(data.serverNow) - Date.now();
  }
  return data;
}

export const api = {
  me: () => request("/api/me", { quietAuth: true }),
  register: (username, password) => request("/api/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) => request("/api/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/api/logout", { method: "POST", body: "{}", quietAuth: true }),
  board: () => request("/api/board"),
  achievements: () => request("/api/achievements"),
  history: () => request("/api/history"),
  updateWeek: (week, body) => request(`/api/weeks/${week}`, { method: "PUT", body: JSON.stringify(body) }),
  day: (week, day) => request(`/api/days/${week}/${day}`),
  updateDay: (week, day, body) => request(`/api/days/${week}/${day}`, { method: "PUT", body: JSON.stringify(body) }),
  timer: (week, day, action) => request(`/api/days/${week}/${day}/timer/${action}`, { method: "POST", body: "{}" }),
  elapsed: (week, day, elapsedSeconds) => request(`/api/days/${week}/${day}/timer/elapsed`, {
    method: "POST",
    body: JSON.stringify({ elapsedSeconds }),
  }),
  addDetail: (week, day, text) => request(`/api/days/${week}/${day}/details`, {
    method: "POST",
    body: JSON.stringify({ text }),
  }),
  updateDetail: (id, body) => request(`/api/details/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteDetail: (id) => request(`/api/details/${id}`, { method: "DELETE" }),
};

export function saveDayKeepalive(week, day, body) {
  fetch(`/api/days/${week}/${day}`, {
    method: "PUT",
    keepalive: true,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
