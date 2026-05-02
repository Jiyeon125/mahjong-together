function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatHHmm(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getNowIso(): string {
  return new Date().toISOString();
}

export function buildIsoRangeFromHHmm(
  startHHmm: string,
  endHHmm: string,
): { startIso: string; endIso: string } {
  const startParts = startHHmm.split(":").map(Number);
  const endParts = endHHmm.split(":").map(Number);

  if (
    startParts.length !== 2 ||
    endParts.length !== 2 ||
    Number.isNaN(startParts[0]) ||
    Number.isNaN(startParts[1]) ||
    Number.isNaN(endParts[0]) ||
    Number.isNaN(endParts[1])
  ) {
    throw new Error("시간 형식이 올바르지 않습니다.");
  }

  const base = new Date();
  const start = new Date(base);
  start.setHours(startParts[0], startParts[1], 0, 0);

  const end = new Date(base);
  end.setHours(endParts[0], endParts[1], 0, 0);

  // 23:00 ~ 01:00 같은 케이스를 다음날 종료로 처리
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
