const NICKNAME_MAX_LENGTH = 20;
const TABLE_TITLE_MAX_LENGTH = 40;
const TABLE_DESCRIPTION_MAX_LENGTH = 200;

const NICKNAME_ALLOWED_PATTERN = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ ._-]+$/;

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function normalizeNickname(value: string): string {
  return stripControlChars(value).replace(/\s+/g, " ").trim();
}

export function normalizeTitle(value: string): string {
  return stripControlChars(value).trim();
}

export function normalizeDescription(value: string): string {
  return stripControlChars(value).trim();
}

export function getNicknameValidationMessage(value: string): string | null {
  const normalized = normalizeNickname(value);
  if (!normalized) {
    return "닉네임은 공백 없이 1~20자로 입력해주세요.";
  }
  if (normalized.length > NICKNAME_MAX_LENGTH) {
    return "닉네임은 공백 없이 1~20자로 입력해주세요.";
  }
  if (!NICKNAME_ALLOWED_PATTERN.test(normalized)) {
    return "닉네임에는 한글, 영문, 숫자, 공백, ., _, - 만 사용할 수 있습니다.";
  }
  return null;
}

export function isNicknameValid(value: string): boolean {
  return getNicknameValidationMessage(value) === null;
}

export function getTitleValidationMessage(value: string): string | null {
  const normalized = normalizeTitle(value);
  if (!normalized || normalized.length > TABLE_TITLE_MAX_LENGTH) {
    return "제목은 1~40자로 입력해주세요.";
  }
  return null;
}

export function getDescriptionValidationMessage(value: string): string | null {
  const normalized = normalizeDescription(value);
  if (normalized.length > TABLE_DESCRIPTION_MAX_LENGTH) {
    return "설명은 200자 이내로 입력해주세요.";
  }
  return null;
}
