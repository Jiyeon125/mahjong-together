import type { MahjongTable, Participant } from "../types";
import { TableCard } from "./TableCard";

type TableListProps = {
  tables: MahjongTable[];
  participants: Participant[];
  getJoinState: (table: MahjongTable) => { disabled: boolean; reason?: string };
  onJoin: (tableId: string) => void;
  onDetail: (tableId: string) => void;
  onCopyShare: (tableId: string) => void;
};

export function TableList({
  tables,
  participants,
  getJoinState,
  onJoin,
  onDetail,
  onCopyShare,
}: TableListProps) {
  if (tables.length === 0) {
    return (
      <section className="card">
        <p>조건에 맞는 탁이 없습니다.</p>
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
            onJoin={onJoin}
            onDetail={onDetail}
            onCopyShare={onCopyShare}
          />
        );
      })}
    </section>
  );
}
