import type { MahjongTable, Participant } from "../types";
import { isTableExpired } from "./tableStatus";

export type JoinButtonState = {
  label: string;
  disabled: boolean;
  reason?: string;
};

export function getJoinButtonState(
  table: MahjongTable,
  participants: Participant[],
  currentUserId: string,
  hasNickname: boolean,
): JoinButtonState {
  if (table.status === "CANCELLED") {
    return { label: "취소됨", disabled: true, reason: "마감된 탁에는 참가할 수 없습니다." };
  }
  if (table.status === "CLOSED") {
    return { label: "모집 마감됨", disabled: true, reason: "마감된 탁에는 참가할 수 없습니다." };
  }
  if (table.status === "EXPIRED" || isTableExpired(table)) {
    return { label: "만료됨", disabled: true, reason: "시간이 지난 탁에는 참가할 수 없습니다." };
  }
  if (participants.some((participant) => participant.userId === currentUserId)) {
    return { label: "참가 중", disabled: true, reason: "이미 참가한 탁입니다." };
  }
  if (participants.length >= table.maxPlayers) {
    return { label: "정원 마감", disabled: true, reason: "이미 모집 인원이 가득 찼습니다." };
  }
  if (!hasNickname) {
    return { label: "닉네임 입력 후 참가", disabled: false, reason: "닉네임을 먼저 설정해주세요." };
  }
  return { label: "참가하기", disabled: false };
}
