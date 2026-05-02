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
  leaveDisabled: boolean;
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
  leaveDisabled,
  expiredNotice,
  onCopyShare,
  onJoin,
  onLeave,
  onClose,
  onCancel,
  onBack,
}: TableDetailProps) {
  const isHost = table.hostUserId === currentUserId;
  const seats = Array.from({ length: table.maxPlayers }).map((_, index) => {
    const participant = participants[index];
    return participant ? `${index + 1}. ${participant.nickname}` : `${index + 1}. 모집 중`;
  });

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
        {seats.map((seat) => (
          <p key={seat}>{seat}</p>
        ))}
      </div>
      {expiredNotice && <p className="warning">만료된 탁입니다.</p>}

      <div className="actions">
        <button type="button" className="btn-ghost" onClick={onCopyShare}>
          공유 문구 복사
        </button>
        {!isHost ? (
          <>
            <button type="button" className="btn-primary" onClick={onJoin} disabled={joinDisabled}>
              참가하기
            </button>
            <button type="button" className="btn-secondary" onClick={onLeave} disabled={leaveDisabled}>
              나가기
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={table.status === "CLOSED"}>
              모집 마감
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={onCancel}
              disabled={table.status === "CANCELLED"}
            >
              탁 취소
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
