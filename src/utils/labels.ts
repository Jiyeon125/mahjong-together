import type { GameType, MahjongTable, MemberType, TableStatus } from "../types";

export function getMemberTypeLabel(memberType: MemberType): string {
  if (memberType === "THREE") return "3인";
  if (memberType === "FOUR") return "4인";
  return "3인·4인 상관없음";
}

export function getGameTypeLabel(gameType: GameType): string {
  if (gameType === "EAST") return "동풍전";
  if (gameType === "SOUTH") return "반장전";
  return "상관없음";
}

export function getStatusLabel(status: TableStatus): string {
  if (status === "RECRUITING") return "모집 중";
  if (status === "READY") return "시작 가능";
  if (status === "CLOSED") return "마감";
  if (status === "CANCELLED") return "취소됨";
  return "만료됨";
}

export function getDisplayStatusLabel(table: MahjongTable, participantCount: number): string {
  if (table.status === "READY" && table.memberType === "ANY") {
    if (participantCount >= 4) return "4인 시작 가능";
    return "3인 시작 가능";
  }
  return getStatusLabel(table.status);
}

export function getStatusBadgeClass(table: MahjongTable, participantCount: number): string {
  if (table.status === "READY" && table.memberType === "ANY") {
    if (participantCount >= 4) return "ready-four";
    return "ready-three";
  }
  return table.status.toLowerCase();
}
