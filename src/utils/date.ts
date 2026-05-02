function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatHHmm(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatHHmm(startIso)} ~ ${formatHHmm(endIso)}`;
}

export function createDateTimeFromTimeInput(time: string, baseDate = new Date()): Date {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("시간 형식이 올바르지 않습니다.");
  }
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function buildIsoRangeFromHHmm(
  startHHmm: string,
  endHHmm: string,
): { startIso: string; endIso: string } {
  const start = createDateTimeFromTimeInput(startHHmm);
  const end = createDateTimeFromTimeInput(endHHmm);

  // 23:00 ~ 01:00 같은 케이스를 다음날 종료로 처리
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
