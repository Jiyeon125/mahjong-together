import { useEffect, useState } from "react";
import type { CurrentUser } from "../types";

type NicknameBoxProps = {
  currentUser: CurrentUser;
  onSaveNickname: (nickname: string) => void;
};

export function NicknameBox({ currentUser, onSaveNickname }: NicknameBoxProps) {
  const [nicknameInput, setNicknameInput] = useState(currentUser.nickname);
  const [isEditing, setIsEditing] = useState(!currentUser.nickname.trim());

  useEffect(() => {
    setNicknameInput(currentUser.nickname);
    if (!currentUser.nickname.trim()) {
      setIsEditing(true);
    }
  }, [currentUser.nickname]);

  const save = () => {
    onSaveNickname(nicknameInput);
    if (nicknameInput.trim()) {
      setIsEditing(false);
    }
  };

  if (currentUser.nickname.trim() && !isEditing) {
    return (
      <section className="nickname-inline">
        <p>현재 닉네임: {currentUser.nickname}</p>
        <button type="button" className="btn-ghost" onClick={() => setIsEditing(true)}>
          닉네임 변경
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>내 닉네임</h2>
      {!currentUser.nickname.trim() && (
        <p className="warning">탁 생성/참가를 위해 오픈채팅 닉네임을 설정해주세요.</p>
      )}
      <div className="field">
        <label htmlFor="nickname">오픈채팅 닉네임</label>
        <input
          id="nickname"
          value={nicknameInput}
          onChange={(event) => setNicknameInput(event.target.value)}
          maxLength={20}
          placeholder="닉네임을 입력하세요 (최대 20자)"
        />
      </div>
      <div className="actions">
        <button type="button" className="btn-primary" onClick={save}>
          닉네임 저장
        </button>
      </div>
    </section>
  );
}
