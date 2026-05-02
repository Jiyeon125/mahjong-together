import type { CurrentUser } from "../types";

const CURRENT_USER_KEY = "currentUser";

function fallbackUUID(): string {
  const timestamp = Date.now().toString(16);
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `${timestamp.slice(0, 8)}-${random.slice(0, 4)}-${random.slice(
    4,
    8,
  )}-${random.slice(8, 12)}-${random.slice(12, 24)}`;
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
  const existing = parseJSON<CurrentUser | null>(
    localStorage.getItem(CURRENT_USER_KEY),
    null,
  );
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
