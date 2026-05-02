import { assertSupabaseConfigured, supabase } from "../lib/supabase";
import type { CurrentUser, MahjongTable, Participant } from "../types";
import { getEffectiveStatus, isTableExpired } from "../utils/tableStatus";
import { createUUID } from "../utils/storage";

type TableRow = {
  id: string;
  title: string;
  host_user_id: string;
  host_nickname: string;
  member_type: MahjongTable["memberType"];
  min_players: number;
  max_players: number;
  start_time: string;
  end_time: string;
  game_type: MahjongTable["gameType"];
  description: string | null;
  status: MahjongTable["status"];
  created_at: string;
  updated_at: string;
};

type ParticipantRow = {
  id: string;
  table_id: string;
  user_id: string;
  nickname: string;
  joined_at: string;
};

type CreateTablePayload = {
  title: string;
  hostUserId: string;
  hostNickname: string;
  memberType: MahjongTable["memberType"];
  minPlayers: number;
  maxPlayers: number;
  startTime: string;
  endTime: string;
  gameType: MahjongTable["gameType"];
  description?: string;
};

function mapTableRowToModel(row: TableRow): MahjongTable {
  return {
    id: row.id,
    title: row.title,
    hostUserId: row.host_user_id,
    hostNickname: row.host_nickname,
    memberType: row.member_type,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    startTime: row.start_time,
    endTime: row.end_time,
    gameType: row.game_type,
    description: row.description ?? "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureSupabaseReady(): void {
  assertSupabaseConfigured();
}

function mapParticipantRowToModel(row: ParticipantRow): Participant {
  return {
    id: row.id,
    tableId: row.table_id,
    userId: row.user_id,
    nickname: row.nickname,
    joinedAt: row.joined_at,
  };
}

function mapTableModelToInsert(payload: CreateTablePayload): TableRow {
  const nowIso = new Date().toISOString();
  return {
    id: createUUID(),
    title: payload.title,
    host_user_id: payload.hostUserId,
    host_nickname: payload.hostNickname,
    member_type: payload.memberType,
    min_players: payload.minPlayers,
    max_players: payload.maxPlayers,
    start_time: payload.startTime,
    end_time: payload.endTime,
    game_type: payload.gameType,
    description: payload.description?.trim() || null,
    status: "RECRUITING",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function mapParticipantModelToInsert(participant: Participant): ParticipantRow {
  return {
    id: participant.id,
    table_id: participant.tableId,
    user_id: participant.userId,
    nickname: participant.nickname,
    joined_at: participant.joinedAt,
  };
}

export async function fetchTables(): Promise<MahjongTable[]> {
  ensureSupabaseReady();
  const { data, error } = await supabase
    .from("mahjong_tables")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data as TableRow[])
    .map(mapTableRowToModel)
    .filter((table) => table.status !== "CANCELLED" && table.status !== "EXPIRED");
}

export async function fetchParticipants(): Promise<Participant[]> {
  ensureSupabaseReady();
  const { data, error } = await supabase.from("table_participants").select("*");
  if (error) throw error;
  return (data as ParticipantRow[]).map(mapParticipantRowToModel);
}

export async function updateUserNickname(userId: string, newNickname: string): Promise<void> {
  ensureSupabaseReady();

  const { error: participantError } = await supabase
    .from("table_participants")
    .update({ nickname: newNickname })
    .eq("user_id", userId);
  if (participantError) throw participantError;

  const { error: hostTableError } = await supabase
    .from("mahjong_tables")
    .update({
      host_nickname: newNickname,
      updated_at: new Date().toISOString(),
    })
    .eq("host_user_id", userId);
  if (hostTableError) throw hostTableError;
}

export async function createTable(input: CreateTablePayload): Promise<string> {
  ensureSupabaseReady();
  validateTableTimeRange(input.endTime);
  const tableInsert = mapTableModelToInsert(input);
  const { error: tableError } = await supabase.from("mahjong_tables").insert(tableInsert);
  if (tableError) throw tableError;

  const hostParticipant: Participant = {
    id: createUUID(),
    tableId: tableInsert.id,
    userId: input.hostUserId,
    nickname: input.hostNickname,
    joinedAt: new Date().toISOString(),
  };
  const { error: participantError } = await supabase
    .from("table_participants")
    .insert(mapParticipantModelToInsert(hostParticipant));

  // 생성자 참가 등록 실패 시 탁 생성을 롤백 시도해 불일치 상태를 줄인다.
  if (participantError) {
    await supabase.from("mahjong_tables").delete().eq("id", tableInsert.id);
    throw participantError;
  }
  return tableInsert.id;
}

async function getTableAndParticipants(tableId: string): Promise<{
  table: MahjongTable;
  tableParticipants: Participant[];
}> {
  ensureSupabaseReady();
  const { data: tableData, error: tableError } = await supabase
    .from("mahjong_tables")
    .select("*")
    .eq("id", tableId)
    .single();
  if (tableError) throw tableError;

  const { data: participantData, error: participantError } = await supabase
    .from("table_participants")
    .select("*")
    .eq("table_id", tableId);
  if (participantError) throw participantError;

  return {
    table: mapTableRowToModel(tableData as TableRow),
    tableParticipants: (participantData as ParticipantRow[]).map(mapParticipantRowToModel),
  };
}

async function updateStatusFromParticipants(
  table: MahjongTable,
  tableParticipants: Participant[],
): Promise<void> {
  const nextStatus = getEffectiveStatus(table, tableParticipants);
  if (nextStatus === table.status) return;

  const { error } = await supabase
    .from("mahjong_tables")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", table.id);
  if (error) throw error;
}

async function markExpiredIfNeeded(table: MahjongTable): Promise<boolean> {
  if (!isTableExpired(table)) return false;
  if (!["RECRUITING", "READY"].includes(table.status)) return false;

  const { error } = await supabase
    .from("mahjong_tables")
    .update({
      status: "EXPIRED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", table.id)
    .in("status", ["RECRUITING", "READY"]);
  if (error) throw error;
  return true;
}

export async function joinTable(tableId: string, currentUser: CurrentUser): Promise<void> {
  const { table, tableParticipants } = await getTableAndParticipants(tableId);

  if (tableParticipants.some((participant) => participant.userId === currentUser.userId)) {
    throw new Error("이미 참가한 탁입니다.");
  }
  if (tableParticipants.length >= table.maxPlayers) {
    throw new Error("이미 모집 인원이 가득 찼습니다.");
  }
  if (["CLOSED", "CANCELLED", "EXPIRED"].includes(table.status)) {
    throw new Error("마감된 탁에는 참가할 수 없습니다.");
  }
  if (await markExpiredIfNeeded(table)) {
    throw new Error("시간이 지난 탁에는 참가할 수 없습니다.");
  }

  const participant: Participant = {
    id: createUUID(),
    tableId,
    userId: currentUser.userId,
    nickname: currentUser.nickname.trim(),
    joinedAt: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from("table_participants")
    .insert(mapParticipantModelToInsert(participant));
  if (insertError) throw insertError;

  await updateStatusFromParticipants(table, [...tableParticipants, participant]);
}

export async function leaveTable(tableId: string, currentUser: CurrentUser): Promise<void> {
  const { table, tableParticipants } = await getTableAndParticipants(tableId);

  if (table.hostUserId === currentUser.userId) {
    throw new Error("생성자는 탁 나가기 대신 탁 취소를 사용할 수 있습니다.");
  }

  const mine = tableParticipants.find((participant) => participant.userId === currentUser.userId);
  if (!mine) throw new Error("참가 중인 탁이 아닙니다.");

  const { error: deleteError } = await supabase
    .from("table_participants")
    .delete()
    .eq("table_id", tableId)
    .eq("user_id", currentUser.userId);
  if (deleteError) throw deleteError;

  await updateStatusFromParticipants(
    table,
    tableParticipants.filter((participant) => participant.userId !== currentUser.userId),
  );
}

export async function closeTable(tableId: string, currentUser: CurrentUser): Promise<void> {
  ensureSupabaseReady();
  const { data, error } = await supabase
    .from("mahjong_tables")
    .select("host_user_id")
    .eq("id", tableId)
    .single();
  if (error) throw error;
  if ((data as { host_user_id: string }).host_user_id !== currentUser.userId) {
    throw new Error("생성자만 모집 마감할 수 있습니다.");
  }

  const { error: updateError } = await supabase
    .from("mahjong_tables")
    .update({ status: "CLOSED", updated_at: new Date().toISOString() })
    .eq("id", tableId);
  if (updateError) throw updateError;
}

export async function cancelTable(tableId: string, currentUser: CurrentUser): Promise<void> {
  ensureSupabaseReady();
  const { data, error } = await supabase
    .from("mahjong_tables")
    .select("host_user_id")
    .eq("id", tableId)
    .single();
  if (error) throw error;
  if ((data as { host_user_id: string }).host_user_id !== currentUser.userId) {
    throw new Error("생성자만 탁 취소를 할 수 있습니다.");
  }

  const { error: updateError } = await supabase
    .from("mahjong_tables")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", tableId);
  if (updateError) throw updateError;
}

export async function expireOldTables(): Promise<void> {
  ensureSupabaseReady();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("mahjong_tables")
    .update({ status: "EXPIRED", updated_at: nowIso })
    .lt("end_time", nowIso)
    .in("status", ["RECRUITING", "READY"]);
  if (error) throw error;
}

export function validateTableTimeRange(endTime: string): void {
  // 자정 넘김(예: 23:00~01:00)은 build 로직에서 다음날 종료로 보정되므로 허용.
  // 보정 이후에도 end가 현재보다 과거라면 이미 끝난 탁이므로 생성을 막는다.
  if (new Date(endTime).getTime() < Date.now()) {
    throw new Error("이미 종료된 시간으로는 탁을 생성할 수 없습니다.");
  }
}
