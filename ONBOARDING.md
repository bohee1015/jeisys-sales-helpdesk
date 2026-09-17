# 인수인계 — 영업 지원 헬프데스크 챗봇

다른 계정/환경에서 이 프로젝트를 이어서 작업하기 위한 브리핑입니다. 자세한 규칙은 저장소 안의
[CLAUDE.md](./CLAUDE.md)(작업 규칙)와 [PRD.md](./PRD.md)(기획서)를 반드시 먼저 읽어주세요 —
이 문서는 그 둘을 대체하지 않고, "지금 어디까지 됐고 무엇이 남았는지"만 보충합니다.

## 무엇을 만드는 중인가
영업사원(약 20명)이 Teams/전화/카카오톡으로 흩어져 보내던 업무 요청을 챗봇 하나로 모으는 사내
헬프데스크. 자연어로 요청을 입력하면 자동으로 카테고리(정산/장비납품/데모/업체등록·변경/출고/
쇼핑몰/파이프드라이브/기타)를 분류하고, 필수값이 빠지면 되묻고, 선행 업무(예: 기안 승인) 확인이
필요하면 먼저 확인한다. 3개 탭: 챗봇 화면(`/`) · FAQ(`/faq`) · 접수 이력(`/history`) · 관리자
화면(`/admin`, admin 전용).

## 저장소 / 배포 / 인증 (지금 연결된 것들)
- **GitHub**: private 저장소 `bohee1015/jeisys-sales-helpdesk` (브랜치 `main`)에 지금까지의 작업이
  전부 커밋·푸시되어 있다. 다른 환경에서는 이 저장소를 `git clone`해서 시작하면 된다.
  - CLAUDE.md에 "코드를 고칠 때마다 자동으로 이 저장소에 커밋·푸시한다"는 규칙이 이미 적혀 있다 —
    새 환경에서도 `.env`에 같은 `GITHUB_TOKEN`(repo 권한)만 넣으면 그대로 이어서 동작한다.
- **Supabase**: 기존에 쓰던 **JEIMAP 프로젝트**를 그대로 재사용 중이다 (프로젝트 주소는 `.env`의 `NEXT_PUBLIC_SUPABASE_URL` 참고).
  로그인은 그 프로젝트의 기존 `auth.users`/`public.profiles`(role: admin/sales)를 쓰고, 이 앱만의
  요청/FAQ 데이터는 같은 프로젝트 안에 분리된 **`helpdesk` 스키마**(`helpdesk.requests`,
  `helpdesk.faqs`)에 저장한다. **`public`/`pipedrive_dashboard`/`creditcalc` 등 기존 스키마는 절대
  건드리면 안 된다** — 이건 사용자가 명시적으로 못 박은 제약이다.
- **배포 대상**: Vercel (아직 실제 배포는 안 한 상태 — 로컬 개발 중).

## `.env`에 필요한 값 (git에는 없다 — 안전한 채널로 직접 옮겨야 함)
```
GITHUB_TOKEN=              # bohee1015 계정, repo 권한
SUPABASE_ACCESS_TOKEN=     # Supabase CLI/Management API용
VERCEL_TOKEN=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
`.env`는 `.gitignore`에 있어서 clone해도 안 따라온다. 새 환경에서 이 파일을 다시 만들어야 로그인·
GitHub 자동 푸시·Supabase 작업이 전부 동작한다.

## 지금까지 된 것
- 자연어 챗봇 분류/추출 파이프라인 (`app/lib/nlp.ts`, `extract.ts`, `categories.ts`,
  `fieldExtraction.ts`) — 정규식/키워드 기반, LLM 미사용. 실제 영업팀 메시지 90여 건으로 계속
  검증하며 다듬는 중.
- Supabase Auth 로그인(로그인 화면만, 계정 생성/가입은 기존 jeimap 체계에 위임) + RLS로 본인 요청만
  조회 가능.
- 3탭 UI, FAQ CRUD(관리자), 관리자 요청 상태 변경/답변, "원문보기"(전체 대화 보기).
- 한 메시지에 서로 다른 업무가 "및/그리고"로 이어지면 요청 2건으로 분리 접수하는 기능.
- AI-native 디자인 가이드에서 적용 가능한 부분 반영 (primary/secondary 색 토큰, 버튼/카드/인풋
  공용 클래스, 챗봇 타이핑 인디케이터, 메시지 fade-in 애니메이션) — `app/globals.css` 참고.

## 최근에 끝낸 것 (이전 세션의 남은 일 2건)
1. **분류 버그: "크레딧"이 있어도 분류를 못 하던 문제 — 수정 완료.**
   "크레딧"(쇼핑몰:크레딧)과 "팁"(출고:소모품)이 같이 나오면 둘 다 hits=1로 동점이 되어
   `classifySubcategory`가 `null`을 반환했다. `app/lib/nlp.ts`의 `BOOST_RULES`에 "크레딧"이 있으면
   `shop:credit`에 +1 가산점을 주는 규칙을 추가했다 — "크레딧"은 요청 자체를 가리키는 말이라
   배경 설명으로 쓰이는 일이 거의 없는 반면, "팁"은 "팁이 몇 개 안 남았다"처럼 사유 설명으로 자주
   끼어들기 때문이다.
2. **폰트를 Pretendard로 변경 — 완료.** 가변 폰트 파일(`app/fonts/PretendardVariable.woff2`)을
   저장소에 포함하고 `next/font/local`로 self-host 한다(`app/layout.tsx`). `app/globals.css`의
   `--font-sans`는 `var(--font-pretendard)`를 먼저 보고 실패 시 기존 system-ui 스택으로 내려간다.

## 지금 당장 이어서 할 일
- 아직 Vercel 실제 배포를 안 했다 — 배포 시 `.env` 값들을 Vercel 환경 변수로 옮겨야 한다.
- 실제 영업팀 메시지로 분류 정확도 검증을 계속 이어가면 된다.

## 참고
- 개발 서버: `npm run dev` (Next.js 16 + Turbopack). Next 16은 `middleware.ts`가 아니라
  `proxy.ts`이고 export 함수명도 `proxy`라는 점 주의 (`AGENTS.md`/CLAUDE.md에 명시됨).
- 이 프로젝트는 사내 전용(Internal) 데이터를 다룬다 — 외부 공유·공개 금지 (PRD 7번).
