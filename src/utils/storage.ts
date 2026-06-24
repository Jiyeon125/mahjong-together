import type { CurrentUser } from "../types";

const CURRENT_USER_KEY = "currentUser";

function fallbackUUID(): string {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error("Secure random generator is unavailable in this environment.");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // RFC4122 v4: set version (4) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
}

export function createUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return fallbackUUID();
}

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("localStorage 파싱 실패:", error);
    return fallback;
  }
}

export function getOrCreateCurrentUser(): CurrentUser {
  const existing = parseJSON<CurrentUser | null>(localStorage.getItem(CURRENT_USER_KEY), null);
  if (existing?.userId) {
    return existing;
  }
  const created: CurrentUser = { userId: createUUID(), nickname: "" };
  saveCurrentUser(created);
  return created;
}

export function saveCurrentUser(currentUser: CurrentUser): void {
  // 초기 렌더의 빈 상태가 저장되어 userId가 꼬이지 않도록 방어한다.
  if (!currentUser.userId?.trim()) {
    return;
  }
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  } catch (error) {
    console.error("currentUser 저장 실패:", error);
  }
}

export function resetLocalCurrentUser(): CurrentUser {
  const resetUser: CurrentUser = { userId: createUUID(), nickname: "" };
  saveCurrentUser(resetUser);
  return resetUser;
}
