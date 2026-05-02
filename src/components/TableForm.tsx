import { useEffect, useRef, useState } from "react";
import type { GameType, MemberType } from "../types";
import { addHours, formatTimeInput, roundUpToNext30Minutes } from "../utils/date";

export type CreateTableInput = {
  title: string;
  memberType: MemberType;
  startTime: string;
  endTime: string;
  gameType: GameType;
  description: string;
};

type TableFormProps = {
  disabled: boolean;
  isActionLoading: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onCreate: (input: CreateTableInput) => void;
};

export function TableForm({
  disabled,
  isActionLoading,
  isOpen,
  onToggleOpen,
  onCreate,
}: TableFormProps) {
  const [title, setTitle] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("FOUR");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("02:00");
  const [gameType, setGameType] = useState<GameType>("SOUTH");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    // 접힘 -> 펼침 전환 시점에만 기본 시간을 현재 기준으로 계산한다.
    if (isOpen && !prevIsOpen.current) {
      const start = roundUpToNext30Minutes(new Date());
      const end = addHours(start, 2);
      setStartTime(formatTimeInput(start));
      setEndTime(formatTimeInput(end));
      setMemberType("FOUR");
      setGameType("SOUTH");
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  const submit = () => {
    if (!title.trim()) {
      setFormError("제목을 입력해주세요.");
      return;
    }
    if (!startTime || !endTime) {
      setFormError("시작 시간과 종료 시간을 입력해주세요.");
      return;
    }
    setFormError("");
    onCreate({
      title,
      memberType,
      startTime,
      endTime,
      gameType,
      description,
    });
  };

  return (
    <section
      className={`card table-form-card ${isOpen ? "expanded" : "collapsed"}`}
      id="create-table-form"
    >
      <button type="button" className="form-toggle" onClick={onToggleOpen} aria-expanded={isOpen}>
        <h3>친선탁 생성하기</h3>
      </button>
      {isOpen && (
        <>
      {formError && <p className="warning">{formError}</p>}

      <div className="field">
        <label htmlFor="table-title">제목 *</label>
        <input
          id="table-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 오늘 23시 4인 반장 하실 분"
          maxLength={40}
        />
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="member-type">인원 유형 *</label>
          <select
            id="member-type"
            value={memberType}
            onChange={(event) => setMemberType(event.target.value as MemberType)}
          >
            <option value="THREE">3인</option>
            <option value="FOUR">4인</option>
            <option value="ANY">상관없음</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="start-time">시작 시간 *</label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="end-time">종료 시간 *</label>
          <input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="game-type">게임 방식 *</label>
        <select
          id="game-type"
          value={gameType}
          onChange={(event) => setGameType(event.target.value as GameType)}
        >
          <option value="EAST">동풍전</option>
          <option value="SOUTH">반장전</option>
          <option value="ANY">상관없음</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="description">설명</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={200}
          placeholder="예: 초보 가능, 편하게 한 판"
        />
      </div>

      <button
        type="button"
        className="btn-primary form-submit-full"
        onClick={submit}
        disabled={disabled || isActionLoading}
      >
        {isActionLoading ? "생성 중..." : "+ 친선탁 만들기"}
      </button>
        </>
      )}
    </section>
  );
}
