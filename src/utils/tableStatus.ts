import type { MahjongTable, Participant, TableStatus } from "../types";

export function isTableExpired(table: MahjongTable): boolean {
  return new Date(table.endTime).getTime() < Date.now();
}

export function getEffectiveStatus(
  table: MahjongTable,
  participants: Participant[],
): TableStatus {
  if (table.status === "CANCELLED") return "CANCELLED";
  if (table.status === "CLOSED") return "CLOSED";

  if (isTableExpired(table)) {
    return "EXPIRED";
  }

  const count = participants.filter((p) => p.tableId === table.id).length;
  if (count >= table.minPlayers) return "READY";
  return "RECRUITING";
}

export function applyEffectiveStatuses(
  tables: MahjongTable[],
  participants: Participant[],
): MahjongTable[] {
  return tables.map((table) => {
    const effectiveStatus = getEffectiveStatus(table, participants);
    if (table.status === effectiveStatus) return table;
    return {
      ...table,
      status: effectiveStatus,
      updatedAt: new Date().toISOString(),
    };
  });
}
