# MYtube

유튜브 구독 채널을 주제별 폴더로 분류해 폴더 안에서 바로 재생하고, X·Facebook은 채널/페이지 URL 링크 버튼으로 함께 정리하는 개인용 웹앱입니다.

## 플랫폼 연동

| 플랫폼 | 방식 |
|--------|------|
| YouTube | Google OAuth + YouTube Data API v3 (구독·영상 캐시 동기화, IFrame 재생) |
| X | API 없음 — 이름+URL 수동 등록, 새 탭 이동 |
| Facebook | API 없음 — 이름+URL 수동 등록, 새 탭 이동 |

## 기술 스택

- Next.js (App Router) + Tailwind CSS
- Auth.js (Google OAuth, YouTube readonly scope)
- Prisma + SQLite (로컬) / PostgreSQL로 전환 가능
- dnd-kit (폴더 순서 UI는 이후 확장)

## 시작하기

1. 의존성 설치

```bash
npm install
```

## Google OAuth 설정 (필수)

로그인 오류 `Missing required parameter: client_id` 는 **Gmail 주소/비밀번호를 `.env`에 넣었을 때** 자주 발생합니다.
필요한 값은 Google Cloud의 **OAuth 2.0 클라이언트 ID / 보안 비밀번호**입니다.

1. [Google Cloud Console → 사용자 인증 정보](https://console.cloud.google.com/apis/credentials)
2. **OAuth 클라이언트 ID** 만들기 → 애플리케이션 유형: **웹 애플리케이션**
3. 승인된 리디렉션 URI:
   `http://localhost:3000/api/auth/callback/google`
4. [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) 사용 설정
5. `.env` 예시:

```env
AUTH_GOOGLE_ID="123456789-xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxx"
AUTH_SECRET="임의-긴-문자열"
AUTH_URL="http://localhost:3000"
```

6. `.env` 저장 후 개발 서버 재시작: `npm run dev`

### 테스트 사용자 추가 (403 access_denied 해결)

OAuth 동의 화면이 **테스트**이면, 등록된 계정만 로그인할 수 있습니다.

1. [OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent) 열기
2. **테스트 사용자** → **ADD USERS**
3. 로그인할 Gmail 추가 후 저장
4. 잠시 뒤 다시 로그인

개인 프로젝트는 “프로덕션 게시”가 필요 없습니다. 테스트 사용자만 넣으면 됩니다.

UI만 미리 보려면 `http://localhost:3000/demo` 를 사용하세요.


```bash
npm run db:migrate
```

4. 개발 서버

```bash
npm run dev
```

## 화면

- `/login` — Google로 계속하기
- `/` — 대시보드 (폴더 가로 카드 + 영상 미리보기)
- `/folders` — 폴더 CRUD + 채널 다대다 배정
- `/folders/[id]` — 최신 영상(상단) + X/FB 링크 버튼(하단) + 인라인 재생
- `/settings` — 동기화 주기, 수동 동기화

## API 할당량

구독/영상은 실시간 호출이 아니라 `video_cache`에 저장합니다. 설정 화면의 「지금 동기화」또는 `/api/cron/sync-videos`로 갱신하세요.
