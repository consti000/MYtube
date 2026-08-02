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
- Prisma + **PostgreSQL** (Neon / Vercel Postgres)
- 배포: **Vercel**

## 시작하기 (로컬)

1. PostgreSQL 준비 (Neon 무료 DB 또는 Docker)

```bash
docker run --name mytube-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mytube -p 5432:5432 -d postgres:16
```

2. `.env` 설정 (`.env.example` 참고)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytube"
AUTH_SECRET="임의-긴-문자열"
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
AUTH_URL="http://localhost:3000"
```

> Neon을 쓰면 `sslmode=require`가 포함된 연결 문자열을 그대로 넣으면 됩니다.

3. 의존성 · 마이그레이션 · 실행

```bash
npm install
npx prisma migrate deploy
npm run dev
```

UI 미리보기: `http://localhost:3000/demo`

## Google OAuth 설정

1. [사용자 인증 정보](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트(웹) 생성
2. 승인된 리디렉션 URI:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - Vercel: `https://YOUR-PROJECT.vercel.app/api/auth/callback/google`
3. [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) 사용 설정
4. OAuth 동의 화면이 **테스트**면 [테스트 사용자](https://console.cloud.google.com/apis/credentials/consent)에 본인 Gmail 추가

## Vercel 배포 가이드 (단계별)

### 1) 코드 푸시
GitHub `main`에 최신 코드가 있어야 합니다.

### 2) Vercel 가입 · 프로젝트 연결
1. https://vercel.com 접속 → GitHub로 로그인  
2. **Add New… → Project** → 저장소 `MYtube` Import  
3. Framework Preset: **Next.js** (자동 감지)

### 3) PostgreSQL 만들기
다음 중 하나:

**A. Vercel 대시보드**  
Storage → **Create Database** → **Postgres** → 프로젝트에 연결  
→ `DATABASE_URL`이 환경 변수로 자동 연결되는 경우가 많음

**B. Neon** (https://console.neon.tech)  
프로젝트 생성 → Connection string 복사 → Vercel 환경 변수에 `DATABASE_URL`로 등록

### 4) 환경 변수 (Project → Settings → Environment Variables)

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Postgres / Neon 연결 문자열 (`sslmode=require` 권장) |
| `AUTH_SECRET` | 긴 임의 문자열 |
| `AUTH_GOOGLE_ID` | Google OAuth 클라이언트 ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth 시크릿 |
| `AUTH_URL` | `https://YOUR-PROJECT.vercel.app` (배포 URL) |

Production / Preview에 모두 넣는 것을 권장합니다.

### 5) 빌드 설정
저장소의 `vercel.json`과 `npm run build`에 이미 포함됨:

`prisma generate && prisma migrate deploy && next build`

Deploy 시 테이블이 자동 생성·갱신됩니다.

### 6) 배포
**Deploy** 클릭 → 빌드 성공 확인 → 상단 도메인 복사  
예: `https://mytube-xxxx.vercel.app`

### 7) Google 리디렉션 URI 업데이트
Google OAuth 클라이언트에 추가:

`https://YOUR-PROJECT.vercel.app/api/auth/callback/google`

`AUTH_URL`도 같은 도메인으로 맞춘 뒤 **Redeploy** 한 번 더 실행하세요.

### 8) 접속
브라우저에서 Vercel URL 열기 → PC · 폰 · 태블릿 동일 주소로 사용 가능합니다.

### 참고
- GitHub Pages(`*.github.io`)는 정적만 가능 → 이 앱 실행용이 아님  
- Free 티어·서버리스 특성상 콜드 스타트가 있을 수 있음

## 화면

- `/login` — Google로 계속하기
- `/` — 대시보드
- `/folders` — 폴더·채널·링크 관리
- `/folders/[id]` — 영상 피드 + X/FB 링크 + 인라인 재생
- `/settings` — 동기화
- `/demo` — UI 미리보기(로그인 없음)

## API 할당량

구독/영상은 `video_cache`에 저장합니다. 설정 화면의 「지금 동기화」또는 `/api/cron/sync-videos`로 갱신하세요.
