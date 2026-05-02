import { useEffect, useMemo, useState } from "react";
import { FilterTabs } from "./components/FilterTabs";
import { NicknameBox } from "./components/NicknameBox";
import { TableDetail } from "./components/TableDetail";
import { TableForm } from "./components/TableForm";
import type { CreateTableInput } from "./components/TableForm";
import { TableList } from "./components/TableList";
import type { CurrentUser, FilterType, MahjongTable, Participant } from "./types";
import { getJoinButtonState } from "./utils/joinButton";
import {
  cancelTable,
  closeTable,
  createTable,
  expireOldTables,
  fetchParticipants,
  fetchTables,
  joinTable,
  leaveTable,
  updateUserNickname,
  validateTableTimeRange,
} from "./services/tableService";
import { buildIsoRangeFromHHmm } from "./utils/date";
import { buildTableShareText } from "./utils/share";
import { applyEffectiveStatuses, isTableExpired } from "./utils/tableStatus";
import {
  getDescriptionValidationMessage,
  getNicknameValidationMessage,
  getTitleValidationMessage,
  isNicknameValid,
  normalizeDescription,
  normalizeNickname,
  normalizeTitle,
} from "./utils/validation";
import { getOrCreateCurrentUser, saveCurrentUser } from "./utils/storage";
import "./index.css";

function getMemberRange(memberType: MahjongTable["memberType"]): {
  minPlayers: number;
  maxPlayers: number;
} {
  if (memberType === "THREE") return { minPlayers: 3, maxPlayers: 3 };
  if (memberType === "FOUR") return { minPlayers: 4, maxPlayers: 4 };
  return { minPlayers: 3, maxPlayers: 4 };
}

function getReadableErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    const knownMessages = new Set([
      "닉네임을 먼저 설정해주세요.",
      "이미 참가한 탁입니다.",
      "이미 모집 인원이 가득 찼습니다.",
      "마감된 탁에는 참가할 수 없습니다.",
      "시간이 지난 탁에는 참가할 수 없습니다.",
      "생성자는 탁 나가기 대신 탁 취소를 사용할 수 있습니다.",
      "참가 중인 탁이 아닙니다.",
      "이미 종료된 시간으로는 탁을 생성할 수 없습니다.",
      "닉네임에는 한글, 영문, 숫자, 공백, ., _, - 만 사용할 수 있습니다.",
      "제목은 1~40자로 입력해주세요.",
      "설명은 200자 이내로 입력해주세요.",
    ]);
    if (knownMessages.has(message)) {
      return message;
    }
  }
  return fallback;
}

type MessageTone = "success" | "error" | "info";
type ConfirmAction = { kind: "close" | "cancel" | "leave"; tableId: string };

function parseTableIdFromPath(pathname: string): string | null {
  if (pathname === "/" || pathname === "/tables") return null;
  const matched = pathname.match(/^\/tables\/([^/]+)$/);
  return matched ? decodeURIComponent(matched[1]) : null;
}

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    userId: "",
    nickname: "",
  });
  const [tables, setTables] = useState<MahjongTable[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(() =>
    parseTableIdFromPath(window.location.pathname),
  );
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [shareFallbackText, setShareFallbackText] = useState("");
  const [fallbackCopyLoading, setFallbackCopyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [joiningTableId, setJoiningTableId] = useState<string | null>(null);
  const [copyingTableId, setCopyingTableId] = useState<string | null>(null);
  const [leavingTableId, setLeavingTableId] = useState<string | null>(null);
  const [manageTableId, setManageTableId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [pendingJoinTableId, setPendingJoinTableId] = useState<string | null>(null);
  const [joinNicknameInput, setJoinNicknameInput] = useState("");
  const [showJoinNicknamePrompt, setShowJoinNicknamePrompt] = useState(false);
  const [showNicknameSetupHint, setShowNicknameSetupHint] = useState(false);
  const [recentCreatedTableId, setRecentCreatedTableId] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const refreshFromServer = async () => {
    await expireOldTables();
    const [nextTables, nextParticipants] = await Promise.all([fetchTables(), fetchParticipants()]);
    setTables(applyEffectiveStatuses(nextTables, nextParticipants));
    setParticipants(nextParticipants);
  };

  const reloadListsOnly = async () => {
    const [nextTables, nextParticipants] = await Promise.all([fetchTables(), fetchParticipants()]);
    setTables(applyEffectiveStatuses(nextTables, nextParticipants));
    setParticipants(nextParticipants);
  };

  useEffect(() => {
    const initialize = async () => {
      const user = getOrCreateCurrentUser();
      setCurrentUser(user);
      try {
        await refreshFromServer();
      } catch (error) {
        console.error(error);
        setMessage("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setMessageTone("error");
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!currentUser.userId?.trim()) return;
    saveCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const onPopState = () => {
      setSelectedTableId(parseTableIdFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateToList = () => {
    window.history.pushState({}, "", "/tables");
    setSelectedTableId(null);
  };

  const navigateToTableDetail = (tableId: string) => {
    window.history.pushState({}, "", `/tables/${encodeURIComponent(tableId)}`);
    setSelectedTableId(tableId);
  };

  const normalizedParticipants = useMemo(() => {
    const latestNickname = currentUser.nickname.trim();
    if (!latestNickname) return participants;
    return participants.map((participant) =>
      participant.userId === currentUser.userId
        ? { ...participant, nickname: latestNickname }
        : participant,
    );
  }, [participants, currentUser.userId, currentUser.nickname]);

  const normalizedTables = useMemo(() => {
    const latestNickname = currentUser.nickname.trim();
    if (!latestNickname) return tables;
    return tables.map((table) =>
      table.hostUserId === currentUser.userId ? { ...table, hostNickname: latestNickname } : table,
    );
  }, [tables, currentUser.userId, currentUser.nickname]);

  const effectiveTables = useMemo(
    () => applyEffectiveStatuses(normalizedTables, normalizedParticipants),
    [normalizedTables, normalizedParticipants],
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
    return normalizedParticipants
      .filter((participant) => participant.tableId === selectedTableId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }, [normalizedParticipants, selectedTableId]);
  const hasNickname = isNicknameValid(currentUser.nickname);

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

  const getJoinStateForTable = (table: MahjongTable) => {
    const tableParticipants = normalizedParticipants.filter(
      (participant) => participant.tableId === table.id,
    );
    return getJoinButtonState(table, tableParticipants, currentUser.userId, hasNickname);
  };

  const handleSaveNickname = async (nickname: string): Promise<boolean> => {
    const normalized = normalizeNickname(nickname);
    const nicknameError = getNicknameValidationMessage(normalized);
    if (nicknameError) {
      setMessage(nicknameError);
      setMessageTone("error");
      return false;
    }

    if (normalized === normalizeNickname(currentUser.nickname)) {
      setShowNicknameSetupHint(false);
      return true;
    }

    setNicknameSaving(true);
    try {
      await updateUserNickname(currentUser.userId, normalized);
      const nextUser = { ...currentUser, nickname: normalized };
      saveCurrentUser(nextUser);
      setCurrentUser(nextUser);
      setShowNicknameSetupHint(false);

      // 닉네임 변경 직후에는 화면을 먼저 동기화해 즉시 반영한다.
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.userId === currentUser.userId
            ? { ...participant, nickname: normalized }
            : participant,
        ),
      );
      setTables((prev) =>
        prev.map((table) =>
          table.hostUserId === currentUser.userId ? { ...table, hostNickname: normalized } : table,
        ),
      );

      // 서버 최종값으로 재동기화 (닉네임 변경 성공 자체와 분리)
      try {
        await reloadListsOnly();
      } catch (refreshError) {
        console.error("닉네임 변경 후 목록 재조회 실패:", refreshError);
      }

      setMessage("닉네임이 변경되었습니다.");
      setMessageTone("success");
      return true;
    } catch (error) {
      console.error(error);
      setMessage("닉네임 변경에 실패했습니다. 다시 시도해주세요.");
      setMessageTone("error");
      return false;
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleCreateTable = async (input: CreateTableInput) => {
    if (!isNicknameValid(currentUser.nickname)) {
      setMessage("닉네임을 먼저 설정해주세요.");
      setMessageTone("error");
      return;
    }
    const title = normalizeTitle(input.title);
    const titleError = getTitleValidationMessage(title);
    if (titleError) {
      setMessage(titleError);
      setMessageTone("error");
      return;
    }
    const description = normalizeDescription(input.description);
    const descriptionError = getDescriptionValidationMessage(description);
    if (descriptionError) {
      setMessage(descriptionError);
      setMessageTone("error");
      return;
    }
    if (!input.startTime || !input.endTime) {
      setMessage("시작 시간과 종료 시간을 입력해주세요.");
      setMessageTone("error");
      return;
    }

    let range: { startIso: string; endIso: string };
    try {
      range = buildIsoRangeFromHHmm(input.startTime, input.endTime);
      validateTableTimeRange(range.endIso);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "시간 형식이 올바르지 않거나 이미 종료된 시간입니다.";
      setMessage(errorMessage);
      setMessageTone("error");
      return;
    }

    const playerRange = getMemberRange(input.memberType);
    setCreateLoading(true);
    try {
      const createdTableId = await createTable({
        title,
        hostUserId: currentUser.userId,
        hostNickname: currentUser.nickname.trim(),
        memberType: input.memberType,
        minPlayers: playerRange.minPlayers,
        maxPlayers: playerRange.maxPlayers,
        startTime: range.startIso,
        endTime: range.endIso,
        gameType: input.gameType,
        description,
      });
      await refreshFromServer();
      setRecentCreatedTableId(createdTableId);
      setIsCreateFormOpen(false);
      setMessage("친선탁이 생성되었습니다. 공유 문구를 복사해 오픈채팅에 올려보세요.");
      setMessageTone("success");
    } catch (error) {
      console.error(error);
      setMessage(getReadableErrorMessage(error, "요청을 처리하지 못했습니다. 다시 시도해주세요."));
      setMessageTone("error");
    } finally {
      setCreateLoading(false);
    }
  };

  const doJoin = async (tableId: string, nickname: string) => {
    setJoiningTableId(tableId);
    try {
      await joinTable(tableId, { ...currentUser, nickname: nickname.trim() });
      await refreshFromServer();
      setMessage("탁에 참가했습니다.");
      setMessageTone("success");
    } catch (error) {
      console.error(error);
      setMessage(getReadableErrorMessage(error, "요청을 처리하지 못했습니다. 다시 시도해주세요."));
      setMessageTone("error");
    } finally {
      setJoiningTableId((prev) => (prev === tableId ? null : prev));
    }
  };

  const handleJoinTable = async (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    if (!isNicknameValid(currentUser.nickname)) {
      setShowNicknameSetupHint(true);
      setPendingJoinTableId(tableId);
      setJoinNicknameInput(currentUser.nickname);
      setShowJoinNicknamePrompt(true);
      return;
    }

    if (isTableExpired(table) && ["RECRUITING", "READY"].includes(table.status)) {
      setJoiningTableId(tableId);
      try {
        await refreshFromServer();
      } catch (error) {
        console.error(error);
      } finally {
        setJoiningTableId((prev) => (prev === tableId ? null : prev));
      }
      setMessage("시간이 지난 탁에는 참가할 수 없습니다.");
      setMessageTone("error");
      return;
    }

    const joinState = getJoinStateForTable(table);
    if (joinState.disabled) {
      setMessage(joinState.reason ?? "참가할 수 없습니다.");
      setMessageTone("error");
      return;
    }

    await doJoin(tableId, currentUser.nickname);
  };

  const executeLeaveTable = async (tableId: string) => {
    setLeavingTableId(tableId);
    try {
      await leaveTable(tableId, currentUser);
      await refreshFromServer();
      setMessage("탁에서 나갔습니다.");
      setMessageTone("success");
    } catch (error) {
      console.error(error);
      setMessage(getReadableErrorMessage(error, "요청을 처리하지 못했습니다. 다시 시도해주세요."));
      setMessageTone("error");
    } finally {
      setLeavingTableId((prev) => (prev === tableId ? null : prev));
    }
  };

  const handleLeaveTable = async (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    if (table.hostUserId === currentUser.userId) {
      setMessage("생성자는 탁 나가기 대신 탁 취소를 사용할 수 있습니다.");
      setMessageTone("error");
      return;
    }

    const joined = participants.some(
      (participant) => participant.tableId === tableId && participant.userId === currentUser.userId,
    );
    if (!joined) {
      setMessage("참가 중인 탁이 아닙니다.");
      setMessageTone("error");
      return;
    }
    setConfirmAction({ kind: "leave", tableId });
  };

  const handleCloseRecruiting = (tableId: string) => {
    setConfirmAction({ kind: "close", tableId });
  };

  const handleCancelTable = (tableId: string) => {
    setConfirmAction({ kind: "cancel", tableId });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setManageTableId(action.tableId);
    setConfirmLoading(true);
    try {
      if (action.kind === "leave") {
        await executeLeaveTable(action.tableId);
      } else if (action.kind === "close") {
        await closeTable(action.tableId, currentUser);
        await refreshFromServer();
        setMessage("모집이 마감되었습니다.");
        setMessageTone("success");
      } else {
        await cancelTable(action.tableId, currentUser);
        await refreshFromServer();
        navigateToList();
        setMessage("탁이 취소되었습니다.");
        setMessageTone("success");
      }
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      setMessage(getReadableErrorMessage(error, "요청을 처리하지 못했습니다. 다시 시도해주세요."));
      setMessageTone("error");
    } finally {
      setConfirmLoading(false);
      setManageTableId((prev) => (prev === action.tableId ? null : prev));
    }
  };

  const handleSaveAndJoin = async () => {
    const normalized = normalizeNickname(joinNicknameInput);
    const nicknameError = getNicknameValidationMessage(normalized);
    if (nicknameError) {
      setMessage(nicknameError);
      setMessageTone("error");
      return;
    }
    setCurrentUser((prev) => ({ ...prev, nickname: normalized }));
    setShowJoinNicknamePrompt(false);
    if (pendingJoinTableId) {
      const targetId = pendingJoinTableId;
      setPendingJoinTableId(null);
      await doJoin(targetId, normalized);
    }
  };

  const handleCopyShareText = async (tableId: string) => {
    const table = effectiveTables.find((item) => item.id === tableId);
    if (!table) return;

    setCopyingTableId(tableId);
    const tableParticipants = normalizedParticipants
      .filter((participant) => participant.tableId === tableId)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const detailUrl = `${window.location.origin}/tables/${encodeURIComponent(table.id)}`;
    const shareText = buildTableShareText(table, tableParticipants, detailUrl);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API 미지원");
      }
      await navigator.clipboard.writeText(shareText);
      setShareFallbackText("");
      setMessage("공유 문구가 복사되었습니다.");
      setMessageTone("success");
    } catch (error) {
      console.error("공유 문구 복사 실패:", error);
      setShareFallbackText(shareText);
      setMessage("복사에 실패했습니다. 아래 문구를 직접 복사해주세요.");
      setMessageTone("error");
    } finally {
      setCopyingTableId((prev) => (prev === tableId ? null : prev));
    }
  };

  const isSelectedTableJoinedByMe = selectedParticipants.some(
    (participant) => participant.userId === currentUser.userId,
  );

  const selectedJoinState = selectedTable
    ? getJoinStateForTable(selectedTable)
    : { label: "참가 불가", disabled: true };
  const selectedLeaveDisabled =
    !selectedTable ||
    !isSelectedTableJoinedByMe ||
    selectedTable.hostUserId === currentUser.userId ||
    ["CLOSED", "CANCELLED", "EXPIRED"].includes(selectedTable.status);
  const selectedExpiredNotice =
    !!selectedTable && (selectedTable.status === "EXPIRED" || isTableExpired(selectedTable));
  const joinedTableIds = new Set(
    normalizedParticipants
      .filter((participant) => participant.userId === currentUser.userId)
      .map((participant) => participant.tableId),
  );
  const myJoinedTables = visibleTables.filter((table) => joinedTableIds.has(table.id));
  const otherVisibleTables =
    myJoinedTables.length > 0
      ? visibleTables.filter((table) => !joinedTableIds.has(table.id))
      : visibleTables;

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>마작투게더</h1>
          <p>마작일번가 오픈채팅 친선탁 모집을 위한 웹앱</p>
        </header>
        <section className="card">
          <p>데이터를 불러오는 중...</p>
        </section>
        {message && <div className={`toast toast-floating ${messageTone}`}>{message}</div>}
      </div>
    );
  }

  const routeRequestedDetail = selectedTableId !== null;

  if (!hasNickname && !routeRequestedDetail) {
    return (
      <div className="app">
        <header className="header">
          <h1>마작투게더</h1>
          <p>마작일번가 오픈채팅 친선탁 모집을 위한 웹앱</p>
          <p className="header-desc">
            친선탁을 만들고 참가자를 모집해 보세요!
          </p>
        </header>
        {message && <div className={`toast toast-floating ${messageTone}`}>{message}</div>}
        <NicknameBox
          currentUser={currentUser}
          showSetupHint={showNicknameSetupHint}
          isSaving={nicknameSaving}
          onSaveNickname={handleSaveNickname}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>마작투게더</h1>
        <p>마작일번가 오픈채팅 친선탁 모집을 위한 웹앱</p>
        <p className="header-desc">
          친선탁을 만들고 참가자를 모집해 보세요!
        </p>
      </header>

      {message && <div className={`toast toast-floating ${messageTone}`}>{message}</div>}
      {showJoinNicknamePrompt && (
        <section className="card join-prompt">
          <h2>참가하려면 닉네임이 필요합니다.</h2>
          <p className="subtle">오픈채팅 닉네임을 입력해주세요.</p>
          <div className="field">
            <label htmlFor="join-nickname">오픈채팅 닉네임</label>
            <input
              id="join-nickname"
              value={joinNicknameInput}
              onChange={(event) => setJoinNicknameInput(event.target.value)}
              maxLength={20}
              placeholder="오픈채팅 닉네임"
            />
          </div>
          <div className="actions">
            <button type="button" className="btn-primary" onClick={() => void handleSaveAndJoin()}>
              저장하고 참가하기
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowJoinNicknamePrompt(false);
                setPendingJoinTableId(null);
              }}
            >
              닫기
            </button>
          </div>
        </section>
      )}
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
              disabled={fallbackCopyLoading}
              onClick={() => {
                void (async () => {
                  setFallbackCopyLoading(true);
                  try {
                    if (!navigator.clipboard?.writeText) {
                      throw new Error("Clipboard API 미지원");
                    }
                    await navigator.clipboard.writeText(shareFallbackText);
                    setShareFallbackText("");
                    setMessage("공유 문구가 복사되었습니다.");
                    setMessageTone("success");
                  } catch (error) {
                    console.error("공유 문구 재복사 실패:", error);
                    setMessage("복사에 실패했습니다. 문구를 직접 복사해주세요.");
                    setMessageTone("error");
                  } finally {
                    setFallbackCopyLoading(false);
                  }
                })();
              }}
            >
              {fallbackCopyLoading ? "복사 중..." : "다시 복사 시도"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShareFallbackText("")}>
              닫기
            </button>
          </div>
        </section>
      )}

      {!(showJoinNicknamePrompt && !hasNickname) && (
        <NicknameBox
          currentUser={currentUser}
          showSetupHint={showNicknameSetupHint}
          isSaving={nicknameSaving}
          onSaveNickname={handleSaveNickname}
        />
      )}

      {selectedTable ? (
        <TableDetail
          table={selectedTable}
          participants={selectedParticipants}
          currentUserId={currentUser.userId}
          joinButtonState={selectedJoinState}
          isJoinLoading={joiningTableId === selectedTable.id}
          isLeaveLoading={leavingTableId === selectedTable.id}
          isManageLoading={manageTableId === selectedTable.id}
          isCopyLoading={copyingTableId === selectedTable.id}
          leaveDisabled={selectedLeaveDisabled}
          expiredNotice={selectedExpiredNotice}
          onCopyShare={() => handleCopyShareText(selectedTable.id)}
          onJoin={() => handleJoinTable(selectedTable.id)}
          onLeave={() => handleLeaveTable(selectedTable.id)}
          onClose={() => handleCloseRecruiting(selectedTable.id)}
          onCancel={() => handleCancelTable(selectedTable.id)}
          onBack={navigateToList}
        />
      ) : routeRequestedDetail ? (
        <section className="card empty-state">
          <h3>탁을 찾을 수 없습니다.</h3>
          <p>이미 취소되었거나 만료된 탁일 수 있습니다.</p>
          <button type="button" className="btn-primary" onClick={navigateToList}>
            목록으로 돌아가기
          </button>
        </section>
      ) : (
        <>
          <TableForm
            disabled={!isNicknameValid(currentUser.nickname) || createLoading}
            isActionLoading={createLoading}
            isOpen={isCreateFormOpen}
            onToggleOpen={() => setIsCreateFormOpen((prev) => !prev)}
            onCreate={(input) => void handleCreateTable(input)}
          />
          {recentCreatedTableId && (
            <section className="card created-next-actions">
              <h3>탁이 생성되었습니다.</h3>
              <div className="actions created-next-actions-buttons">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleCopyShareText(recentCreatedTableId)}
                  disabled={copyingTableId === recentCreatedTableId}
                >
                  {copyingTableId === recentCreatedTableId ? "복사 중..." : "공유 문구 복사"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigateToTableDetail(recentCreatedTableId)}
                >
                  상세보기
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setRecentCreatedTableId(null)}
                >
                  닫기
                </button>
              </div>
            </section>
          )}
          <FilterTabs value={filter} onChange={setFilter} />
          {myJoinedTables.length > 0 && (
            <section className="section-group">
              <h2 className="section-title">내가 참가한 탁</h2>
              <TableList
                tables={myJoinedTables}
                participants={normalizedParticipants}
                getJoinButtonState={getJoinStateForTable}
                joiningTableId={joiningTableId}
                copyingTableId={copyingTableId}
                onJoin={(tableId) => void handleJoinTable(tableId)}
                onDetail={navigateToTableDetail}
                onCopyShare={handleCopyShareText}
                onCreateTable={() => {
                  setIsCreateFormOpen(true);
                  document.getElementById("create-table-form")?.scrollIntoView({ behavior: "smooth" });
                }}
                hideEmpty
              />
            </section>
          )}
          <section className="section-group">
            <h2 className="section-title">현재 모집 중인 탁</h2>
          <TableList
            tables={otherVisibleTables}
            participants={normalizedParticipants}
            getJoinButtonState={getJoinStateForTable}
            joiningTableId={joiningTableId}
            copyingTableId={copyingTableId}
            onJoin={(tableId) => void handleJoinTable(tableId)}
            onDetail={navigateToTableDetail}
            onCopyShare={handleCopyShareText}
            onCreateTable={() => {
              setIsCreateFormOpen(true);
              document.getElementById("create-table-form")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          </section>
        </>
      )}
      {confirmAction && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true">
          <section className="confirm-modal">
            <h3>
              {confirmAction.kind === "close"
                ? "모집 마감"
                : confirmAction.kind === "cancel"
                  ? "탁 취소"
                  : "탁 나가기"}
            </h3>
            <p>
              {confirmAction.kind === "close"
                ? "모집을 마감할까요? 마감 후에는 더 이상 참가할 수 없습니다."
                : confirmAction.kind === "cancel"
                  ? "정말 이 탁을 취소할까요? 취소된 탁은 목록에서 보이지 않습니다."
                  : "이 탁에서 나갈까요? 마음이 바뀌면 탁에 다시 참여할 수 있습니다."}
            </p>
            <div className="actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmAction(null)}>
                돌아가기
              </button>
              <button
                type="button"
                className={
                  confirmAction.kind === "close"
                    ? "btn-secondary"
                    : confirmAction.kind === "cancel"
                      ? "btn-danger"
                      : "btn-warn-ghost"
                }
                onClick={() => void handleConfirmAction()}
                disabled={confirmLoading}
              >
                {confirmAction.kind === "close"
                  ? "마감하기"
                  : confirmAction.kind === "cancel"
                    ? "취소하기"
                    : "나가기"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
