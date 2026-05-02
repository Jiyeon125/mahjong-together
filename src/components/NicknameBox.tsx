import { useState } from "react";
import type { CurrentUser } from "../types";

type NicknameBoxProps = {
  currentUser: CurrentUser;
  onSaveNickname: (nickname: string) => void;
  onRegenerateUserId: () => void;
};

export function NicknameBox({
  currentUser,
  onSaveNickname,
  onRegenerateUserId,
}: NicknameBoxProps) {
  const [nicknameInput, setNicknameInput] = useState(currentUser.nickname);

  return (
    <section className="card">
      <h2>내 정보</h2>
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
        <button type="button" className="btn-primary" onClick={() => onSaveNickname(nicknameInput)}>
          닉네임 저장
        </button>
        <button type="button" className="btn-ghost" onClick={onRegenerateUserId}>
          테스트용 새 사용자 ID
        </button>
      </div>
      <p className="subtle">userId: {currentUser.userId}</p>
    </section>
  );
}
