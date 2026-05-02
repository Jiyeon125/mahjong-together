import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "../utils/date";
import {
  getDisplayStatusLabel,
  getGameTypeLabel,
  getMemberTypeLabel,
  getStatusBadgeClass,
} from "../utils/labels";

type TableDetailProps = {
  table: MahjongTable;
  participants: Participant[];
  currentUserId: string;
  joinDisabled: boolean;
  joinDisabledReason?: string;
  leaveDisabled: boolean;
  isActionLoading: boolean;
  expiredNotice: boolean;
  onCopyShare: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onClose: () => void;
  onCancel: () => void;
  onBack: () => void;
};

export function TableDetail({
  table,
  participants,
  currentUserId,
  joinDisabled,
  joinDisabledReason,
  leaveDisabled,
  isActionLoading,
  expiredNotice,
  onCopyShare,
  onJoin,
  onLeave,
  onClose,
  onCancel,
  onBack,
}: TableDetailProps) {
  const isHost = table.hostUserId === currentUserId;
  const getJoinText = (): string => {
    if (isActionLoading) return "처리 중...";
    if (!joinDisabled) return "참가하기";
    if (joinDisabledReason === "이미 참가한 탁입니다.") return "이미 참가 중";
    if (joinDisabledReason === "이미 모집 인원이 가득 찼습니다.") return "정원 마감";
    if (joinDisabledReason === "시간이 지난 탁에는 참가할 수 없습니다.") return "만료됨";
    if (joinDisabledReason === "마감된 탁에는 참가할 수 없습니다.") return "모집 마감";
    return "참가 불가";
  };
  const seats = Array.from({ length: table.maxPlayers }).map((_, index) => participants[index] ?? null);

  return (
    <section className="card detail-card">
      <div className="table-header">
        <span className={`status-badge ${getStatusBadgeClass(table, participants.length)}`}>
          {getDisplayStatusLabel(table, participants.length)}
        </span>
        <h2>{table.title}</h2>
      </div>

      <div className="meta">
        <p>
          인원 수: {participants.length}/{table.maxPlayers}
        </p>
        <p>인원 유형: {getMemberTypeLabel(table.memberType)}</p>
        <p>시간: {formatTimeRange(table.startTime, table.endTime)}</p>
        <p>게임 방식: {getGameTypeLabel(table.gameType)}</p>
        <p>생성자: {table.hostNickname}</p>
        <p>설명: {table.description?.trim() || "설명 없음"}</p>
      </div>

      <div className="seat-list">
        {seats.map((seat, index) => (
          <p key={`seat-${index}`} className={seat ? "" : "seat-empty"}>
            {index + 1}. {seat ? seat.nickname : "모집 중"}
          </p>
        ))}
      </div>
      {expiredNotice && <p className="warning">만료된 탁입니다.</p>}

      <div className="actions">
        <button type="button" className="btn-ghost" onClick={onCopyShare}>
          공유 문구 복사
        </button>
        {!isHost ? (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={onJoin}
              disabled={joinDisabled || isActionLoading}
            >
              {getJoinText()}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onLeave}
              disabled={leaveDisabled || isActionLoading}
            >
              나가기
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={table.status === "CLOSED" || isActionLoading}
            >
              {isActionLoading ? "처리 중..." : "모집 마감"}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={onCancel}
              disabled={table.status === "CANCELLED" || isActionLoading}
            >
              {isActionLoading ? "처리 중..." : "탁 취소"}
            </button>
          </>
        )}
        <button type="button" className="btn-ghost" onClick={onBack}>
          목록으로
        </button>
      </div>
    </section>
  );
}
