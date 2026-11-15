/** Fetch wrapper: same-origin cookies, CSRF header on writes, readable errors. */
export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues: FieldIssue[] = [],
  ) {
    super(message);
  }
}

let csrf: string | null = null;
export const setCsrf = (t: string | null) => (csrf = t);
export const getCsrf = () => csrf;

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (method !== "GET" && csrf) headers["X-CSRF-Token"] = csrf;
  const res = await fetch(url, { method, headers, body: payload, credentials: "same-origin" });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && url !== "/api/login") window.dispatchEvent(new Event("admin:signed-out"));
    throw new ApiError(data?.error ?? res.statusText, res.status, data?.issues ?? []);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};
