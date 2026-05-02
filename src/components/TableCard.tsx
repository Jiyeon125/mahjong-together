import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "../utils/date";
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
  joinDisabled: boolean;
  joinDisabledReason?: string;
  isActionLoading: boolean;
  onJoin: (tableId: string) => void;
  onDetail: (tableId: string) => void;
  onCopyShare: (tableId: string) => void;
};

export function TableCard({
  table,
  participants,
  joinDisabled,
  joinDisabledReason,
  isActionLoading,
  onJoin,
  onDetail,
  onCopyShare,
}: TableCardProps) {
  const progressPercent = Math.min(100, Math.round((participants.length / table.maxPlayers) * 100));
  const capacityHint = getCapacityHint(table, participants.length);
  const getJoinButtonText = (): string => {
    if (isActionLoading) return "처리 중...";
    if (!joinDisabled) return "참가하기";
    if (joinDisabledReason === "이미 참가한 탁입니다.") return "이미 참가 중";
    if (joinDisabledReason === "이미 모집 인원이 가득 찼습니다.") return "정원 마감";
    if (joinDisabledReason === "시간이 지난 탁에는 참가할 수 없습니다.") return "만료됨";
    if (joinDisabledReason === "마감된 탁에는 참가할 수 없습니다.") return "모집 마감";
    return "참가 불가";
  };

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
          className="btn-primary btn-join"
          onClick={(event) => {
            event.stopPropagation();
            onJoin(table.id);
          }}
          disabled={joinDisabled || isActionLoading}
          title={joinDisabledReason}
        >
          {getJoinButtonText()}
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
