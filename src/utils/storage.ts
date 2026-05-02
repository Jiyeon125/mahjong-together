import type { CurrentUser, MahjongTable, Participant } from "../types";
import { buildIsoRangeFromHHmm } from "./date";

const CURRENT_USER_KEY = "currentUser";
const TABLES_KEY = "mahjongTables";
const PARTICIPANTS_KEY = "tableParticipants";

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
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  } catch (error) {
    console.error("currentUser 저장 실패:", error);
  }
}

export function loadTables(): MahjongTable[] {
  return parseJSON<MahjongTable[]>(localStorage.getItem(TABLES_KEY), []);
}

export function saveTables(tables: MahjongTable[]): void {
  try {
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
  } catch (error) {
    console.error("mahjongTables 저장 실패:", error);
  }
}

export function loadParticipants(): Participant[] {
  return parseJSON<Participant[]>(localStorage.getItem(PARTICIPANTS_KEY), []);
}

export function saveParticipants(participants: Participant[]): void {
  try {
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
  } catch (error) {
    console.error("tableParticipants 저장 실패:", error);
  }
}

function getRange(baseHour: number): { startIso: string; endIso: string } {
  const now = new Date();
  const startHour = (now.getHours() + baseHour) % 24;
  const endHour = (startHour + 2) % 24;
  const start = `${String(startHour).padStart(2, "0")}:00`;
  const end = `${String(endHour).padStart(2, "0")}:00`;
  return buildIsoRangeFromHHmm(start, end);
}

export function createSampleData(currentUser: CurrentUser): {
  tables: MahjongTable[];
  participants: Participant[];
} {
  const nowIso = new Date().toISOString();
  const sample1Range = getRange(2);
  const sample2Range = getRange(0);
  const sample3Range = getRange(4);

  const table1Id = createUUID();
  const table2Id = createUUID();
  const table3Id = createUUID();

  const hostNickname = currentUser.nickname.trim() || "샘플방장";
  const guestA = "리치즉리";
  const guestB = "감자";

  const tables: MahjongTable[] = [
    {
      id: table1Id,
      title: "오늘 23시 4인 반장 하실 분",
      hostUserId: currentUser.userId,
      hostNickname,
      memberType: "FOUR",
      minPlayers: 4,
      maxPlayers: 4,
      startTime: sample1Range.startIso,
      endTime: sample1Range.endIso,
      gameType: "SOUTH",
      description: "초보 환영, 편하게 모집합니다.",
      status: "RECRUITING",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: table2Id,
      title: "지금 3마 가볍게 하실 분",
      hostUserId: createUUID(),
      hostNickname: guestA,
      memberType: "THREE",
      minPlayers: 3,
      maxPlayers: 3,
      startTime: sample2Range.startIso,
      endTime: sample2Range.endIso,
      gameType: "EAST",
      description: "빠르게 한 판 하고 해산!",
      status: "RECRUITING",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: table3Id,
      title: "3인/4인 상관없이 사람 되는 대로",
      hostUserId: createUUID(),
      hostNickname: guestB,
      memberType: "ANY",
      minPlayers: 3,
      maxPlayers: 4,
      startTime: sample3Range.startIso,
      endTime: sample3Range.endIso,
      gameType: "ANY",
      description: "모이면 시작하는 자유 탁",
      status: "RECRUITING",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const participants: Participant[] = [
    {
      id: createUUID(),
      tableId: table1Id,
      userId: currentUser.userId,
      nickname: hostNickname,
      joinedAt: nowIso,
    },
    {
      id: createUUID(),
      tableId: table2Id,
      userId: tables[1].hostUserId,
      nickname: guestA,
      joinedAt: nowIso,
    },
    {
      id: createUUID(),
      tableId: table3Id,
      userId: tables[2].hostUserId,
      nickname: guestB,
      joinedAt: nowIso,
    },
  ];

  return { tables, participants };
}

export function ensureInitialData(currentUser: CurrentUser): {
  tables: MahjongTable[];
  participants: Participant[];
} {
  const tables = loadTables();
  const participants = loadParticipants();

  if (tables.length > 0 || participants.length > 0) {
    return { tables, participants };
  }

  const sampleData = createSampleData(currentUser);
  saveTables(sampleData.tables);
  saveParticipants(sampleData.participants);
  return sampleData;
}
