import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "./date";
import { getDisplayStatusLabel, getGameTypeLabel, getMemberTypeLabel } from "./labels";

export function buildTableShareText(
  table: MahjongTable,
  participants: Participant[],
  appUrl: string,
): string {
  const participantNames = participants.map((participant) => participant.nickname);
  const lines = [
    "[마작투게더 친선탁 모집]",
    `탁 제목: ${table.title}`,
    `상태: ${getDisplayStatusLabel(table, participants.length)}`,
    `인원: ${participants.length} / ${table.maxPlayers}`,
    `인원 유형: ${getMemberTypeLabel(table.memberType)}`,
    `시간: ${formatTimeRange(table.startTime, table.endTime)}`,
    `게임 방식: ${getGameTypeLabel(table.gameType)}`,
    `참가자 목록: ${participantNames.length > 0 ? participantNames.join(", ") : "없음"}`,
  ];

  const description = table.description?.trim();
  if (description) {
    lines.push(`설명: ${description}`);
  }

  lines.push(`앱 링크: ${appUrl}`);
  return lines.join("\n");
}
