import type { MahjongTable, Participant } from "../types";
import { formatTimeRange } from "../utils/date";
import {
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
  onJoin: (tableId: string) => void;
  onDetail: (tableId: string) => void;
  onCopyShare: (tableId: string) => void;
};

export function TableCard({
  table,
  participants,
  joinDisabled,
  joinDisabledReason,
  onJoin,
  onDetail,
  onCopyShare,
}: TableCardProps) {
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
        <span className={`status-badge ${getStatusBadgeClass(table, participants.length)}`}>
          {getDisplayStatusLabel(table, participants.length)}
        </span>
        <h3>{table.title}</h3>
      </div>

      <div className="meta">
        <p>
          인원: {participants.length}/{table.maxPlayers}
        </p>
        <p>인원 유형: {getMemberTypeLabel(table.memberType)}</p>
        <p>시간: {formatTimeRange(table.startTime, table.endTime)}</p>
        <p>게임 방식: {getGameTypeLabel(table.gameType)}</p>
      </div>

      <div className="participants">
        {participants.map((participant) => (
          <span key={participant.id} className="participant-pill">
            {participant.nickname}
          </span>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn-primary"
          onClick={(event) => {
            event.stopPropagation();
            onJoin(table.id);
          }}
          disabled={joinDisabled}
          title={joinDisabledReason}
        >
          참가하기
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
