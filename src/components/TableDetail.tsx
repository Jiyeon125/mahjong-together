import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "../utils/date";
import type { JoinButtonState } from "../utils/joinButton";
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
  joinButtonState: JoinButtonState;
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
  joinButtonState,
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
  const joinButtonLabel = isActionLoading ? "처리 중..." : joinButtonState.label;
  const isBlockedJoinState =
    joinButtonState.disabled &&
    ["정원 마감", "모집 마감됨", "만료됨", "취소됨", "참가 불가"].includes(joinButtonState.label);
  const joinButtonClassName = isBlockedJoinState ? "btn-muted" : "btn-primary";
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

      <div className="detail-actions">
        <div className="detail-actions-row">
        {!isHost ? (
          <>
            <button
              type="button"
              className={joinButtonClassName}
              onClick={onJoin}
              disabled={joinButtonState.disabled || isActionLoading}
              title={joinButtonState.reason}
            >
              {joinButtonLabel}
            </button>
            <button
              type="button"
              className="btn-warn-ghost"
              onClick={onLeave}
              disabled={leaveDisabled || isActionLoading}
            >
              탁 나가기
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
        </div>
        <button type="button" className="btn-ghost detail-single-btn" onClick={onCopyShare}>
          공유 문구 복사
        </button>
        <button type="button" className="btn-ghost detail-single-btn" onClick={onBack}>
          목록으로
        </button>
      </div>
    </section>
  );
}
