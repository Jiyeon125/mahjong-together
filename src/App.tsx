import { useEffect, useMemo, useState } from "react";
import { FilterTabs } from "./components/FilterTabs";
import { NicknameBox } from "./components/NicknameBox";
import { TableDetail } from "./components/TableDetail";
import { TableForm } from "./components/TableForm";
import type { CreateTableInput } from "./components/TableForm";
import { TableList } from "./components/TableList";
import type { CurrentUser, FilterType, MahjongTable, Participant } from "./types";
import { buildIsoRangeFromHHmm, getNowIso } from "./utils/date";
import { buildTableShareText } from "./utils/share";
import { applyEffectiveStatuses } from "./utils/tableStatus";
import {
  createSampleData,
  createUUID,
  ensureInitialData,
  getOrCreateCurrentUser,
  saveCurrentUser,
  saveParticipants,
  saveTables,
} from "./utils/storage";
import "./index.css";

function getMemberRange(memberType: MahjongTable["memberType"]): {
  minPlayers: number;
  maxPlayers: number;
} {
  if (memberType === "THREE") return { minPlayers: 3, maxPlayers: 3 };
  if (memberType === "FOUR") return { minPlayers: 4, maxPlayers: 4 };
  return { minPlayers: 3, maxPlayers: 4 };
}

function isNicknameValid(nickname: string): boolean {
  const trimmed = nickname.trim();
  return trimmed.length > 0 && trimmed.length <= 20;
}

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    userId: "",
    nickname: "",
  });
  const [tables, setTables] = useState<MahjongTable[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [message, setMessage] = useState("");
  const [shareFallbackText, setShareFallbackText] = useState("");

  useEffect(() => {
    const user = getOrCreateCurrentUser();
    const initial = ensureInitialData(user);
    setCurrentUser(user);
    setTables(applyEffectiveStatuses(initial.tables, initial.participants));
    setParticipants(initial.participants);
  }, []);

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveTables(tables);
  }, [tables]);

  useEffect(() => {
    saveParticipants(participants);
  }, [participants]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      // 렌더링 중에도 만료 상태를 계속 동기화해 목록/상세 불일치를 막는다.
      setTables((prev) => applyEffectiveStatuses(prev, participants));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [participants]);

  const effectiveTables = useMemo(
    () => applyEffectiveStatuses(tables, participants),
    [tables, participants],
  );

  useEffect(() => {
    if (
      effectiveTables.some((table, index) => {
        const oldTable = tables[index];
        return oldTable && oldTable.status !== table.status;
      })
    ) {
      setTables(effectiveTables);
    }
  }, [effectiveTables, tables]);

  const selectedTable = useMemo(
    () => effectiveTables.find((table) => table.id === selectedTableId) ?? null,
    [effectiveTables, selectedTableId],
  );

  const selectedParticipants = useMemo(() => {
    if (!selectedTableId) return [];
    return participants
      .filter((participant) => participant.tableId === selectedTableId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }, [participants, selectedTableId]);

  const visibleTables = useMemo(() => {
    const filtered = effectiveTables.filter((table) => {
      if (table.status === "CANCELLED" || table.status === "EXPIRED") {
        return false;
      }
      if (filter === "ALL") return true;
      if (filter === "RECRUITING" || filter === "READY") return table.status === filter;
      return table.memberType === filter;
    });

    return filtered.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [effectiveTables, filter]);

  const canJoinTable = (table: MahjongTable): { disabled: boolean; reason?: string } => {
    if (!isNicknameValid(currentUser.nickname)) {
      return { disabled: true, reason: "닉네임을 먼저 설정해주세요." };
    }
    const tableParticipants = participants.filter((participant) => participant.tableId === table.id);
    if (tableParticipants.some((participant) => participant.userId === currentUser.userId)) {
      return { disabled: true, reason: "이미 참가한 탁입니다." };
    }
    if (tableParticipants.length >= table.maxPlayers) {
      return { disabled: true, reason: "이미 모집 인원이 가득 찼습니다." };
    }
    if (["CLOSED", "CANCELLED", "EXPIRED"].includes(table.status)) {
      return { disabled: true, reason: "마감된 탁에는 참가할 수 없습니다." };
    }
    if (new Date() > new Date(table.endTime)) {
      return { disabled: true, reason: "시간이 지난 탁에는 참가할 수 없습니다." };
    }
    return { disabled: false };
  };

  const handleSaveNickname = (nickname: string) => {
    const trimmed = nickname.trim();
    if (!isNicknameValid(trimmed)) {
      setMessage("닉네임은 공백 없이 1~20자로 입력해주세요.");
      return;
    }
    setCurrentUser((prev) => ({ ...prev, nickname: trimmed }));
    setMessage("닉네임이 저장되었습니다.");
  };

  const handleRegenerateUserId = () => {
    if (!window.confirm("새 사용자 ID로 전환할까요? (테스트용)")) return;
    setCurrentUser((prev) => ({ ...prev, userId: createUUID() }));
    setMessage("새 사용자 ID로 전환되었습니다.");
  };

  const handleCreateTable = (input: CreateTableInput) => {
    if (!isNicknameValid(currentUser.nickname)) {
      setMessage("닉네임을 먼저 설정해주세요.");
      return;
    }
    const title = input.title.trim();
    if (!title) {
      setMessage("제목을 입력해주세요.");
      return;
    }
    if (!input.startTime || !input.endTime) {
      setMessage("시작 시간과 종료 시간을 입력해주세요.");
      return;
    }

    let range: { startIso: string; endIso: string };
    try {
      range = buildIsoRangeFromHHmm(input.startTime, input.endTime);
    } catch {
      setMessage("시간 형식이 올바르지 않습니다.");
      return;
    }

    const nowIso = getNowIso();
    const playerRange = getMemberRange(input.memberType);
    const createdTable: MahjongTable = {
      id: createUUID(),
      title,
      hostUserId: currentUser.userId,
      hostNickname: currentUser.nickname.trim(),
      memberType: input.memberType,
      minPlayers: playerRange.minPlayers,
      maxPlayers: playerRange.maxPlayers,
      startTime: range.startIso,
      endTime: range.endIso,
      gameType: input.gameType,
      description: input.description.trim(),
      status: "RECRUITING",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const hostParticipant: Participant = {
      id: createUUID(),
      tableId: createdTable.id,
      userId: currentUser.userId,
      nickname: currentUser.nickname.trim(),
      joinedAt: nowIso,
    };

    const nextParticipants = [...participants, hostParticipant];
    const nextTables = applyEffectiveStatuses([...tables, createdTable], nextParticipants);
    setParticipants(nextParticipants);
    setTables(nextTables);
    setMessage("친선탁이 생성되었습니다.");
  };

  const handleJoinTable = (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    const joinState = canJoinTable(table);
    if (joinState.disabled) {
      setMessage(joinState.reason ?? "참가할 수 없습니다.");
      return;
    }

    const nextParticipants = [
      ...participants,
      {
        id: createUUID(),
        tableId,
        userId: currentUser.userId,
        nickname: currentUser.nickname.trim(),
        joinedAt: getNowIso(),
      },
    ];

    setParticipants(nextParticipants);
    setTables(applyEffectiveStatuses(tables, nextParticipants));
    setMessage("탁에 참가했습니다.");
  };

  const handleLeaveTable = (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    if (table.hostUserId === currentUser.userId) {
      setMessage("생성자는 나가기 대신 탁 취소를 사용할 수 있습니다.");
      return;
    }

    const joined = participants.some(
      (participant) => participant.tableId === tableId && participant.userId === currentUser.userId,
    );
    if (!joined) {
      setMessage("참가 중인 탁이 아닙니다.");
      return;
    }

    const nextParticipants = participants.filter(
      (participant) => !(participant.tableId === tableId && participant.userId === currentUser.userId),
    );
    setParticipants(nextParticipants);
    setTables(applyEffectiveStatuses(tables, nextParticipants));
    setMessage("탁에서 나갔습니다.");
  };

  const handleCloseRecruiting = (tableId: string) => {
    const nextTables = tables.map((table) =>
      table.id === tableId && table.hostUserId === currentUser.userId
        ? { ...table, status: "CLOSED" as const, updatedAt: getNowIso() }
        : table,
    );
    setTables(nextTables);
    setMessage("모집이 마감되었습니다.");
  };

  const handleCancelTable = (tableId: string) => {
    const nextTables = tables.map((table) =>
      table.id === tableId && table.hostUserId === currentUser.userId
        ? { ...table, status: "CANCELLED" as const, updatedAt: getNowIso() }
        : table,
    );
    setTables(nextTables);
    setSelectedTableId(null);
    setMessage("탁이 취소되었습니다.");
  };

  const handleResetData = () => {
    if (!window.confirm("데이터를 샘플 상태로 초기화할까요?")) return;
    const sample = createSampleData(currentUser);
    const syncedTables = applyEffectiveStatuses(sample.tables, sample.participants);
    setTables(syncedTables);
    setParticipants(sample.participants);
    setSelectedTableId(null);
    setMessage("데이터 초기화가 완료되었습니다.");
  };

  const handleCopyShareText = async (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    const tableParticipants = participants
      .filter((participant) => participant.tableId === tableId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const currentUrl = window.location.href;
    const shareText = buildTableShareText(table, tableParticipants, currentUrl);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API 미지원");
      }
      await navigator.clipboard.writeText(shareText);
      setShareFallbackText("");
      setMessage("공유 문구가 복사되었습니다.");
    } catch (error) {
      console.error("공유 문구 복사 실패:", error);
      setShareFallbackText(shareText);
      setMessage("복사에 실패했습니다. 아래 문구를 직접 복사해주세요.");
    }
  };

  const isSelectedTableJoinedByMe = selectedParticipants.some(
    (participant) => participant.userId === currentUser.userId,
  );

  const selectedJoinState = selectedTable ? canJoinTable(selectedTable) : { disabled: true };
  const selectedLeaveDisabled =
    !selectedTable ||
    !isSelectedTableJoinedByMe ||
    selectedTable.hostUserId === currentUser.userId ||
    ["CLOSED", "CANCELLED", "EXPIRED"].includes(selectedTable.status);

  return (
    <div className="app">
      <header className="header">
        <h1>마작투게더</h1>
        <p>마작일번가 오픈채팅 친선탁 모집판</p>
      </header>

      {message && <div className="toast">{message}</div>}
      {shareFallbackText && (
        <section className="card">
          <h2>직접 복사하기</h2>
          <p className="subtle">클립보드 복사에 실패했습니다. 아래 문구를 직접 복사해주세요.</p>
          <textarea
            value={shareFallbackText}
            readOnly
            rows={10}
            className="share-textarea"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard?.writeText(shareFallbackText).then(() => {
                  setShareFallbackText("");
                  setMessage("공유 문구가 복사되었습니다.");
                });
              }}
            >
              다시 복사 시도
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShareFallbackText("")}>
              닫기
            </button>
          </div>
        </section>
      )}

      <NicknameBox
        currentUser={currentUser}
        onSaveNickname={handleSaveNickname}
        onRegenerateUserId={handleRegenerateUserId}
      />

      {!isNicknameValid(currentUser.nickname) && (
        <p className="warning">닉네임을 먼저 설정해주세요.</p>
      )}

      {selectedTable ? (
        <TableDetail
          table={selectedTable}
          participants={selectedParticipants}
          currentUserId={currentUser.userId}
          joinDisabled={selectedJoinState.disabled}
          leaveDisabled={selectedLeaveDisabled}
          onCopyShare={() => handleCopyShareText(selectedTable.id)}
          onJoin={() => handleJoinTable(selectedTable.id)}
          onLeave={() => handleLeaveTable(selectedTable.id)}
          onClose={() => handleCloseRecruiting(selectedTable.id)}
          onCancel={() => handleCancelTable(selectedTable.id)}
          onBack={() => setSelectedTableId(null)}
        />
      ) : (
        <>
          <TableForm disabled={!isNicknameValid(currentUser.nickname)} onCreate={handleCreateTable} />
          <FilterTabs value={filter} onChange={setFilter} />
          <TableList
            tables={visibleTables}
            participants={participants}
            getJoinState={canJoinTable}
            onJoin={handleJoinTable}
            onDetail={setSelectedTableId}
            onCopyShare={handleCopyShareText}
          />
        </>
      )}

      <footer className="footer-tools">
        <button type="button" className="btn-ghost small" onClick={handleResetData}>
          데이터 초기화
        </button>
      </footer>
    </div>
  );
}

export default App;
