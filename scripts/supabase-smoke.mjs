import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    env[key.trim()] = rest.join("=").trim();
  }
  return env;
}

function nowIsoPlusMinutes(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = loadEnvLocal();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(".env.local의 Supabase 환경변수가 비어 있습니다.");
}

const supabase = createClient(url, key);

const ids = {
  tableId: crypto.randomUUID(),
  hostUserId: crypto.randomUUID(),
  joinerA: crypto.randomUUID(),
  joinerB: crypto.randomUUID(),
  hostParticipantId: crypto.randomUUID(),
  joinerAParticipantId: crypto.randomUUID(),
  joinerBParticipantId: crypto.randomUUID(),
};

const created = {
  table: false,
  hostParticipant: false,
  joinerA: false,
  joinerB: false,
};

async function fetchTableParticipants(tableId) {
  const { data, error } = await supabase
    .from("table_participants")
    .select("*")
    .eq("table_id", tableId);
  if (error) throw error;
  return data;
}

async function fetchTable(tableId) {
  const { data, error } = await supabase.from("mahjong_tables").select("*").eq("id", tableId).single();
  if (error) throw error;
  return data;
}

async function updateStatusFromCount(tableRow, participantCount) {
  let status = "RECRUITING";
  if (tableRow.status === "CLOSED" || tableRow.status === "CANCELLED") {
    status = tableRow.status;
  } else if (new Date() > new Date(tableRow.end_time)) {
    status = "EXPIRED";
  } else if (participantCount >= tableRow.min_players) {
    status = "READY";
  }

  const { error } = await supabase
    .from("mahjong_tables")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tableRow.id);
  if (error) throw error;
  return status;
}

async function cleanup() {
  const { error: pErr } = await supabase.from("table_participants").delete().eq("table_id", ids.tableId);
  if (pErr) console.error("cleanup participants 실패:", pErr.message);
  const { error: tErr } = await supabase.from("mahjong_tables").delete().eq("id", ids.tableId);
  if (tErr) console.error("cleanup table 실패:", tErr.message);
}

try {
  console.log("1) fetchTables 테스트");
  const { data: tables, error: tablesErr } = await supabase
    .from("mahjong_tables")
    .select("*")
    .order("start_time", { ascending: true })
    .limit(5);
  if (tablesErr) throw tablesErr;
  console.log(`- 성공: ${tables.length}건 조회`);

  console.log("2) fetchParticipants 테스트");
  const { data: participants, error: participantsErr } = await supabase
    .from("table_participants")
    .select("*")
    .limit(5);
  if (participantsErr) throw participantsErr;
  console.log(`- 성공: ${participants.length}건 조회`);

  console.log("3) 탁 생성 + 생성자 참가 insert 테스트");
  const tableInsert = {
    id: ids.tableId,
    title: `[SMOKE] ${new Date().toISOString()}`,
    host_user_id: ids.hostUserId,
    host_nickname: "smoke-host",
    member_type: "ANY",
    min_players: 3,
    max_players: 4,
    start_time: nowIsoPlusMinutes(10),
    end_time: nowIsoPlusMinutes(120),
    game_type: "ANY",
    description: "smoke test",
    status: "RECRUITING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: createTableErr } = await supabase.from("mahjong_tables").insert(tableInsert);
  if (createTableErr) throw createTableErr;
  created.table = true;

  const hostParticipantInsert = {
    id: ids.hostParticipantId,
    table_id: ids.tableId,
    user_id: ids.hostUserId,
    nickname: "smoke-host",
    joined_at: new Date().toISOString(),
  };
  const { error: hostInsertErr } = await supabase.from("table_participants").insert(hostParticipantInsert);
  if (hostInsertErr) throw hostInsertErr;
  created.hostParticipant = true;
  console.log("- 성공: mahjong_tables + table_participants insert 확인");

  console.log("4) 참가하기 insert 테스트");
  const joinerAInsert = {
    id: ids.joinerAParticipantId,
    table_id: ids.tableId,
    user_id: ids.joinerA,
    nickname: "smoke-A",
    joined_at: new Date().toISOString(),
  };
  const { error: joinErr } = await supabase.from("table_participants").insert(joinerAInsert);
  if (joinErr) throw joinErr;
  created.joinerA = true;

  let tableParticipants = await fetchTableParticipants(ids.tableId);
  assert(tableParticipants.length === 2, "참가 후 participant 수가 2가 아님");
  console.log("- 성공: 참가자 insert 반영");

  console.log("5) 참가/나가기 후 상태 update 테스트");
  const joinerBInsert = {
    id: ids.joinerBParticipantId,
    table_id: ids.tableId,
    user_id: ids.joinerB,
    nickname: "smoke-B",
    joined_at: new Date().toISOString(),
  };
  const { error: joinBErr } = await supabase.from("table_participants").insert(joinerBInsert);
  if (joinBErr) throw joinBErr;
  created.joinerB = true;

  let tableRow = await fetchTable(ids.tableId);
  tableParticipants = await fetchTableParticipants(ids.tableId);
  const readyStatus = await updateStatusFromCount(tableRow, tableParticipants.length);
  assert(readyStatus === "READY", "3명 참가 시 READY 업데이트 실패");

  const { error: leaveErr } = await supabase
    .from("table_participants")
    .delete()
    .eq("table_id", ids.tableId)
    .eq("user_id", ids.joinerB);
  if (leaveErr) throw leaveErr;
  created.joinerB = false;

  tableRow = await fetchTable(ids.tableId);
  tableParticipants = await fetchTableParticipants(ids.tableId);
  const recruitingStatus = await updateStatusFromCount(tableRow, tableParticipants.length);
  assert(recruitingStatus === "RECRUITING", "나가기 후 RECRUITING 업데이트 실패");
  console.log("- 성공: READY ↔ RECRUITING 상태 업데이트 확인");

  console.log("6) 모집 마감/탁 취소 상태 update 테스트");
  const { error: closeErr } = await supabase
    .from("mahjong_tables")
    .update({ status: "CLOSED", updated_at: new Date().toISOString() })
    .eq("id", ids.tableId);
  if (closeErr) throw closeErr;
  tableRow = await fetchTable(ids.tableId);
  assert(tableRow.status === "CLOSED", "CLOSED 업데이트 실패");

  const { error: cancelErr } = await supabase
    .from("mahjong_tables")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", ids.tableId);
  if (cancelErr) throw cancelErr;
  tableRow = await fetchTable(ids.tableId);
  assert(tableRow.status === "CANCELLED", "CANCELLED 업데이트 실패");
  console.log("- 성공: CLOSED/CANCELLED 상태 반영 확인");

  console.log("테스트 전체 성공");
} catch (error) {
  console.error("테스트 실패:", error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
