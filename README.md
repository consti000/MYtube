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

2. `.env` 설정 (`.env.example` 참고)

- [Google Cloud Console](https://console.cloud.google.com/)에서 OAuth 클라이언트 생성
- YouTube Data API v3 사용 설정
- 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` 입력

3. DB 마이그레이션

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
