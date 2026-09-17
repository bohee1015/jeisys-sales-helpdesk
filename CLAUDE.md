@AGENTS.md

# 프로젝트 규칙서 (CLAUDE.md)

## 1) 프로젝트 개요
영업 지원 헬프데스크 챗봇 — 영업사원(요청자)의 여러 채널(Teams/전화/카카오톡) 문의를 한 곳으로 모으고, 영업관리팀(지원자) 1명의 업무 부담을 줄이는 것이 목표. 상세 기획은 [PRD.md](./PRD.md) 참고.

## 2) 기술 스택 (고정)
- **Next.js 16 (App Router)** — 화면과 API를 한 프로젝트에서 처리
- **React 19**, **TypeScript**
- **Tailwind CSS v4** — 스타일링은 Tailwind 유틸리티 클래스 사용을 기본으로 함
- 배포 대상: **Vercel**
- 위 스택 외 다른 프레임워크·라이브러리를 임의로 추가 제안하지 않는다 (PRD 8번 참고).

## 3) 폴더 구조 규칙
- 라우트/페이지는 `app/` 디렉토리 기준 App Router 규칙을 따른다.
- 공용 UI 컴포넌트는 `app/components/`, 서버 로직(예: 카테고리 분류, 선행 업무 체크)은 `app/lib/` 또는 `app/api/` 아래에 모듈 단위로 분리한다. (실제 코드 작성 시작 전 구조 확정)

## 4) 코딩 컨벤션
- TypeScript strict 모드를 유지하고, `any` 사용을 피한다.
- 컴포넌트는 함수형 컴포넌트로 작성한다.
- 코드에 불필요한 주석을 남기지 않는다. 이유(WHY)가 비직관적인 경우에만 짧은 주석을 남긴다.

## 5) 핵심 기능 구현 시 지킬 규칙
PRD.md 5번(주요 기능)의 규칙을 코드 구현에서도 그대로 지킨다.
- **FAQ 자동 응답**: 답변 확신도가 낮으면(기준 미달 시) 추측 답변 대신 지원자에게 전달한다.
- **카테고리 인식 + 선행 업무 체크**: 선행 조건 미충족 시 처리를 진행하지 않고 요청자에게 즉시 안내한다. 카테고리가 애매하면 임의로 단정하지 않는다.
- ERP 연동, 실시간 채널(Teams/카카오톡/전화) 통합 등 PRD 6번에서 비범위로 정한 기능은 구현하지 않는다.

## 6) 보안 · 환경 변수
- API 키 등 민감 정보는 코드에 하드코딩하지 않고 `.env`에 저장한다. `.env*`는 `.gitignore`에 이미 포함되어 있다.
- 사내 전용(Internal) 데이터이므로 문의 이력·개인정보는 요청자 본인과 영업관리팀만 조회 가능하도록 접근을 제한한다.
- **인증/데이터베이스**: 사용자가 이미 쓰고 있는 **JEIMAP Supabase 프로젝트**(주소는 `.env`의 `NEXT_PUBLIC_SUPABASE_URL` 참고)를 그대로 재사용한다. 로그인은 그 프로젝트의 기존 `auth.users`/`public.profiles`(role: `admin`/`sales`, `public.is_admin()` 함수)를 그대로 사용하고, 이 앱의 요청/FAQ 데이터는 같은 프로젝트 안에 **별도로 분리한 `helpdesk` 스키마**(`helpdesk.requests`, `helpdesk.faqs`)에 저장한다.
- `public`, `pipedrive_dashboard`, `creditcalc` 등 **기존 스키마·테이블·트리거·RLS 정책은 절대 수정하지 않는다.** 새 마이그레이션은 `helpdesk` 스키마 안에서만 작성한다 (`supabase/migrations/`).
- 권한 판단은 반드시 `supabase.auth.getClaims()`로 한다 (`getSession()` 금지 — 서명 검증을 하지 않아 안전하지 않다).
- Next.js 16부터 미들웨어 파일은 `middleware.ts`가 아니라 **`proxy.ts`**이고 export 함수명도 `proxy`다.

## 6-1) 화면 표현 · 디자인 규칙
- 사용자에게 보이는 문구에 **"AI 챗봇"이라는 표현을 쓰지 않는다.** 분류는 키워드·정규식 규칙 기반이고 LLM을 호출하지 않으므로, AI로 소개하면 실제 동작과 다르다.
- 디자인은 사내 영업지도 서비스 **JMAP과 통일**한다. 색 토큰은 `app/globals.css`에 정의되어 있으니 새 화면도 그대로 쓴다.
  - 주색: Jeisys 네이비 `#1f3a93` (`primary`), 포인트: 옐로 `#f5a623` (`accent`, 강조 한 곳에만)
  - 배경 `#f1f2f7`, 카드 흰색, 입력창은 테두리 대신 옅은 블루 `#edf1fa` 채움
- Jeisys 워드마크는 `app/components/JeisysLogo.tsx`를 쓴다. 공식 로고 이미지가 준비되면 이 컴포넌트 내부만 교체한다.
- 모든 화면의 헤더는 `app/components/AppHeader.tsx`를 쓴다.

## 7) 작업 방식 규칙
- 모든 설명과 주석은 한국어로 작성한다.
- 새 파일은 `my-app` 폴더 안에만 만든다.
- 기술 스택은 PRD에 정한 대로 **Next.js로 고정**한다. 다른 프레임워크로 바꾸거나 마이그레이션을 제안하지 않는다. 배포는 **Vercel**을 사용한다.
- 코드를 바꾸면 반드시 무엇을 왜 바꿨는지 한 줄로 알려준다.
- `.env` 등 비밀 정보 파일과 `node_modules` 폴더는 `.gitignore`에 등록해 두고, 절대 커밋하지 않는다.
- 외부 서비스 인증이 필요하면 토큰 값을 사용자에게 묻거나 채팅에 출력하지 말고, `.env`에 있는 값을 읽어서 사용한다.
  - 예: Supabase 작업이 필요하면 Supabase CLI를 설치해 `.env`의 `SUPABASE_ACCESS_TOKEN`으로 작업한다.
  - 예: Vercel 작업(배포 등)이 필요하면 Vercel CLI를 설치해 `.env`의 `VERCEL_TOKEN`으로 인증해 작업한다.
- 파일을 지워야 할 때는 바로 삭제하지 않고, `trash-can/` 폴더를 만들어 그 안으로 옮겨만 둔다. 작업이 끝난 뒤 사용자가 직접 확인하고 삭제한다.
- 이미 설치된 서브에이전트는 필요할 때마다 적극 활용한다.
- **공개 저장소 — 실데이터 커밋 금지**: 2026-09-17부터 저장소가 **public**이다. 아래는 절대 커밋하지 않는다.
  - 실제 고객·직원 정보: 병원명, 원장님 성함·연락처, 직원 이름, 실제 요청 원문 (예시·테스트 데이터는 반드시 가명)
  - 회사 직인·인감 이미지, 사업자번호·입금계좌가 든 양식 파일 (`templates/*.xlsx`는 `.gitignore`로 제외, 배포에는 `.vercelignore` 기준으로 포함)
  - 내부 식별자 (Supabase 프로젝트 ref 등) — 필요하면 `.env`를 참조하라고만 쓴다
  - `trash-can/`, `data/`는 `.gitignore`로 제외되어 있다. 커밋 전 `git status`로 확인한다.
  - 기존 커밋 기록은 private 저장소 `bohee1015/jeisys-sales-helpdesk-private-archive`에 보관되어 있다 (실데이터 포함, 공개 금지).
- **GitHub 자동 커밋/푸시**: 이 저장소는 GitHub 개인 계정(`bohee1015`)의 public 레포 `bohee1015/jeisys-sales-helpdesk`(origin, 브랜치 `main`)에 연결되어 있다. **코드를 수정할 때마다 매번 사용자에게 묻지 말고, 의미 있는 변경 단위마다 알아서 커밋하고 `origin main`에 푸시한다** (사용자가 이 규칙을 통해 미리 승인함).
  - 인증은 `.env`의 `GITHUB_TOKEN`(repo 권한)을 사용한다. GitHub HTTPS smart-http 푸시는 Bearer가 아니라 **Basic 인증**만 받으므로, 아래처럼 커맨드 실행 시점에만 헤더로 주입하고 `origin` 리모트 URL 자체에는 토큰을 저장하지 않는다.
    ```
    git -c http.extraHeader="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)" push origin main
    ```
  - `.env`, `node_modules`, `.bkit/` 등 `.gitignore`에 있는 파일은 절대 커밋하지 않는다(이미 제외되어 있는지 `git status`로 항상 확인).
  - 커밋 메시지는 무엇을 왜 바꿨는지 한국어 한 줄로 요약한다.
