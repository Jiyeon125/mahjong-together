import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "../utils/date";
import type { JoinButtonState } from "../utils/joinButton";
import {
  getCapacityHint,
  getDisplayStatusLabel,
  getGameTypeLabel,
  getMemberTypeLabel,
  getStatusBadgeClass,
} from "../utils/labels";

type TableCardProps = {
  table: MahjongTable;
  participants: Participant[];
  joinButtonState: JoinButtonState;
  isActionLoading: boolean;
  onJoin: (tableId: string) => void;
  onDetail: (tableId: string) => void;
  onCopyShare: (tableId: string) => void;
};

export function TableCard({
  table,
  participants,
  joinButtonState,
  isActionLoading,
  onJoin,
  onDetail,
  onCopyShare,
}: TableCardProps) {
  const progressPercent = Math.min(100, Math.round((participants.length / table.maxPlayers) * 100));
  const capacityHint = getCapacityHint(table, participants.length);
  const joinButtonText = isActionLoading ? "처리 중..." : joinButtonState.label;
  const isBlockedJoinState =
    joinButtonState.disabled &&
    ["정원 마감", "모집 마감됨", "만료됨", "취소됨", "참가 불가"].includes(joinButtonState.label);
  const joinButtonClassName = isBlockedJoinState ? "btn-muted btn-join" : "btn-primary btn-join";

  return (
    <article
      className="card table-card"
      role="button"
      tabIndex={0}
      onClick={() => onDetail(table.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onDetail(table.id);
        }
      }}
    >
      <div className="table-header">
        <div className="badge-row">
          <span className={`status-badge ${getStatusBadgeClass(table, participants.length)}`}>
            {getDisplayStatusLabel(table, participants.length)}
          </span>
          <span className="member-badge">{getMemberTypeLabel(table.memberType)}</span>
        </div>
        <h3>{table.title}</h3>
      </div>

      <div className="meta">
        <p>시간: {formatTimeRange(table.startTime, table.endTime)}</p>
        <p>게임 방식: {getGameTypeLabel(table.gameType)}</p>
        <p className="people-count">
          {participants.length}/{table.maxPlayers}명 <span className="count-hint">· {capacityHint}</span>
        </p>
        <div className="progress-wrap" aria-label="참가 인원 진행도">
          <span className="progress-value" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="participants">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <span key={participant.id} className="participant-pill">
              {participant.nickname}
            </span>
          ))
        ) : (
          <span className="participant-empty">아직 참가자가 없습니다.</span>
        )}
      </div>

      <div className="actions">
        <button
          type="button"
          className={joinButtonClassName}
          onClick={(event) => {
            event.stopPropagation();
            onJoin(table.id);
          }}
          disabled={joinButtonState.disabled || isActionLoading}
          title={joinButtonState.reason}
        >
          {joinButtonText}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={(event) => {
            event.stopPropagation();
            onDetail(table.id);
          }}
        >
          상세보기
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={(event) => {
            event.stopPropagation();
            onCopyShare(table.id);
          }}
        >
          공유 문구 복사
        </button>
      </div>
    </article>
  );
}
