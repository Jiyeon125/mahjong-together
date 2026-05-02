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

export function roundUpToNext30Minutes(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const remainder = minutes % 30;
  const delta = remainder === 0 ? 30 : 30 - remainder;
  next.setMinutes(minutes + delta);
  return next;
}

export function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export function formatTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const now = new Date();
  const start = createDateTimeFromTimeInput(startHHmm, now);
  const end = createDateTimeFromTimeInput(endHHmm, now);

  // 밤 시간(예: 23시)에 00:00~03:00처럼 새벽 시간을 입력하면
  // 사용자의 의도를 "다음날 새벽"으로 해석해 과거 판정을 피한다.
  const isLateNightCreation = now.getHours() >= 18;
  const isEarlyMorningStart = start.getHours() < 6;
  if (isLateNightCreation && isEarlyMorningStart && start <= now) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  // 23:00 ~ 01:00 같은 케이스를 다음날 종료로 처리
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
