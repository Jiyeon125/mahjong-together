import type { MahjongTable, Participant } from "../types";
import { TableCard } from "./TableCard";

type TableListProps = {
  tables: MahjongTable[];
  participants: Participant[];
  getJoinState: (table: MahjongTable) => { disabled: boolean; reason?: string };
  isActionLoading: boolean;
  onJoin: (tableId: string) => void;
  onDetail: (tableId: string) => void;
  onCopyShare: (tableId: string) => void;
  onCreateTable: () => void;
  hideEmpty?: boolean;
};

export function TableList({
  tables,
  participants,
  getJoinState,
  isActionLoading,
  onJoin,
  onDetail,
  onCopyShare,
  onCreateTable,
  hideEmpty = false,
}: TableListProps) {
  if (tables.length === 0) {
    if (hideEmpty) return null;
    return (
      <section className="card empty-state">
        <h3>아직 모집 중인 탁이 없습니다.</h3>
        <p>지금 바로 친선탁을 만들어보세요.</p>
        <button type="button" className="btn-primary" onClick={onCreateTable}>
          친선탁 생성하기
        </button>
      </section>
    );
  }

  return (
    <section className="list-wrap">
      {tables.map((table) => {
        const tableParticipants = participants.filter((participant) => participant.tableId === table.id);
        const joinState = getJoinState(table);
        return (
          <TableCard
            key={table.id}
            table={table}
            participants={tableParticipants}
            joinDisabled={joinState.disabled}
            joinDisabledReason={joinState.reason}
            isActionLoading={isActionLoading}
            onJoin={onJoin}
            onDetail={onDetail}
            onCopyShare={onCopyShare}
          />
        );
      })}
    </section>
  );
}
