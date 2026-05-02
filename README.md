# 마작투게더 (Mahjong Together)

마작일번가 오픈채팅 친선탁 모집을 위한 웹앱 MVP입니다.  
닉네임을 설정하고, 친선탁을 생성/참가/나가기/마감/취소하고, 공유 문구를 복사해 오픈채팅에 바로 올릴 수 있습니다.

## 핵심 기능

- 닉네임 설정/변경 (localStorage 저장)
- 친선탁 생성 (3인/4인/상관없음, 동풍전/반장전/상관없음)
- 탁 목록/필터 (`전체`, `모집 중`, `시작 가능`, `3인`, `4인`, `상관없음`)
- 탁 상세 보기 (`/tables/:tableId` 직접 접근 지원)
- 참가하기 / 탁 나가기
- 생성자 전용 액션: 모집 마감 / 탁 취소
- 공유 문구 복사 + 복사 실패 시 수동 복사용 fallback 제공
- 만료 처리 (`endTime` 경과 시 `EXPIRED`)
- Open Graph/Twitter 메타태그 적용 (도메인 공유 시 미리보기 카드 노출)

## 기술 스택

- React + TypeScript + Vite
- Supabase (`mahjong_tables`, `table_participants`)
- localStorage (현재 사용자 정보만 저장)

## 데이터 저장 정책

- localStorage
  - `currentUser.userId`
  - `currentUser.nickname`
- Supabase
  - `mahjong_tables`
  - `table_participants`

## 프로젝트 구조

```text
.
├─ public/
│  ├─ favicon.svg
│  ├─ icons.svg
│  └─ og-image.png
├─ src/
│  ├─ components/
│  ├─ lib/
│  │  └─ supabase.ts
│  ├─ services/
│  │  └─ tableService.ts
│  ├─ utils/
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ types.ts
├─ index.html
└─ vercel.json
```

## 실행 방법

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경변수 설정

`.env.example`을 참고해 `.env.local` 파일을 만듭니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# optional (if you prefer this name instead of ANON_KEY)
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 3) 개발 서버 실행

```bash
npm run dev
```

### 4) 프로덕션 빌드

```bash
npm run build
```

### 5) 빌드 미리보기

```bash
npm run preview
```

## 자동화 스택

### 로컬 품질 게이트 (Husky + lint-staged)

- `git commit` 시 자동으로 staged 파일만 검사/정리됩니다.
  - `eslint --fix` (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)
  - `prettier --write` (코드/스타일/문서/설정 파일)

### NPM 스크립트

- `npm run typecheck`: 타입 검사
- `npm run lint`: ESLint 검사
- `npm run format:check`: Prettier 포맷 검사
- `npm run build`: 타입 검사 + Vite 빌드
- `npm run audit`: high 이상 취약점 검사
- `npm run check`: lint + format + build + audit 통합 검사

### GitHub Actions

- `CI` 워크플로우 (`.github/workflows/ci.yml`)
  - PR/`main` push 시 `lint`, `format:check`, `build` 실행
- `Security` 워크플로우 (`.github/workflows/security.yml`)
  - PR/`main` push/6시간 주기 스케줄 시 `npm audit --audit-level=high`
  - PR에서 `dependency-review-action`으로 위험 의존성 변경 점검
  - 스케줄 점검 실패 시 `security` 이슈 자동 생성
- `CodeQL` 워크플로우 (`.github/workflows/codeql.yml`)
  - PR/`main` push/주간 스케줄로 정적 보안 분석(SAST) 실행

### Dependabot

- `.github/dependabot.yml` 설정으로
  - npm 의존성 주간 자동 업데이트 PR 생성
  - GitHub Actions 버전 주간 자동 업데이트 PR 생성

### 사고 대응 문서

- 보안 사고 대응 절차: `docs/security-incident-response.md`
  - 탐지 → 격리 → 수정 → 복구 → 사후분석 표준 플로우 제공

## Supabase 테이블 가정

### `mahjong_tables`

- `id`
- `title`
- `host_user_id`
- `host_nickname`
- `member_type`
- `min_players`
- `max_players`
- `start_time`
- `end_time`
- `game_type`
- `description`
- `status`
- `created_at`
- `updated_at`

### `table_participants`

- `id`
- `table_id`
- `user_id`
- `nickname`
- `joined_at`

## 상태 규칙

우선순위:

1. `CANCELLED`
2. `CLOSED`
3. `EXPIRED` (`endTime < now`)
4. `READY` (참가자 수 `>= minPlayers`)
5. `RECRUITING`

추가 규칙:

- `EXPIRED`/`CANCELLED`는 기본 목록에서 숨김
- `CLOSED`는 목록에 보이되 참가 불가
- 참가 직전에도 만료 여부를 다시 확인해 참가를 차단

## 시간 처리 규칙

- 입력값은 `HH:mm` 형태
- 시간 선택은 5분 단위(`step=300`)
- `end <= start`이면 종료를 다음날로 보정 (예: `23:00 ~ 01:00`)
- 늦은 밤(예: 23시)에 `00:00 ~ 03:00` 생성 시, 다음날 새벽 시간으로 해석
- 이미 지난 종료 시각이면 생성 차단

## 닉네임 변경 동기화

닉네임 변경 시 아래를 함께 갱신합니다.

1. localStorage `currentUser.nickname`
2. `table_participants.nickname` (`user_id = currentUser.userId`)
3. `mahjong_tables.host_nickname` (`host_user_id = currentUser.userId`)
4. 목록 재조회 및 즉시 UI 반영

## 라우팅

- `/` 또는 `/tables`: 목록
- `/tables/:tableId`: 상세

Vercel SPA 라우팅을 위해 `vercel.json` rewrite 설정을 사용합니다.

## Open Graph / Twitter 카드

`index.html`에 기본 SEO/OG/Twitter 메타태그가 설정되어 있습니다.

- `og:title`: `마작투게더`
- `og:description`: `마작일번가 오픈채팅 - 친선탁을 만들고 참가자를 모집해 보세요!`
- `og:image`: `/og-image.png`
- `twitter:card`: `summary_large_image`

## 보안/운영 주의

- `ANON`/`PUBLISHABLE` 키는 프론트 노출 가능하지만 RLS 정책이 필수입니다.
- `.env*`, 인증서/키 파일은 `.gitignore`에 제외되어 있습니다.
- 사용자 화면에는 내부 식별자(`userId`, `tableId`, `participantId`)를 노출하지 않습니다.
- 현재 MVP는 Supabase Auth 미도입 상태이며, `localStorage userId`는 강한 신원 보장 수단이 아닙니다.
- 입력값은 클라이언트/서비스 레이어에서 정규화 및 검증합니다.
  - 닉네임: 1~20자, 허용 문자(한글/영문/숫자/공백/`.`/`_`/`-`)
  - 제목: 1~40자
  - 설명: 200자 이하
- DB 보안 스크립트:
  - 권한 최소화: `scripts/supabase-min-privileges.sql`
  - 제약조건/무결성 강화: `scripts/supabase-hardening.sql`

## DB 보안 적용 순서

Supabase SQL Editor에서 아래 순서로 실행하는 것을 권장합니다.

1. `scripts/supabase-min-privileges.sql`
2. `scripts/supabase-hardening.sql`
3. 권한/기능 점검
   - 권한 확인(`role_table_grants`)에서 `TRUNCATE/TRIGGER/REFERENCES`가 `anon/authenticated`에 없는지 확인
   - 아래 핵심 시나리오 회귀 테스트
     1. 탁 목록 조회
     2. 탁 생성
     3. 생성자 자동 참가 등록
     4. 참가하기
     5. 나가기
     6. 닉네임 변경 반영
     7. 모집 마감
     8. 탁 취소
     9. 공유 문구 복사

## MVP 범위 (현재)

- 인증/로그인 없음 (로컬 userId 기반)
- 실시간 구독(WebSocket) 없음 (액션 후 재조회 방식)
- 탁 수정 기능 없음
- 다국어/다크모드 미지원
- 위험 액션(모집 마감/탁 취소/탁 나가기)은 커스텀 확인 모달 사용

---

문의/개선은 이슈로 남겨주세요.
