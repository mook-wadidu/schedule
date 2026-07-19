# 🗓️ 시간표 플래너 (Schedule Planner)

여러 사람이 각자의 하루 일정을 올리면 **1시간 단위 시간표 하나**에 사람별 열로 겹쳐 보여
"언제 다 같이 비는지 / 누가 겹치는지"를 한눈에 비교하는 웹 플래너.

- **프로젝트 단위** — 누구나 프로젝트를 만들고 비밀번호를 정함 (프로젝트당 10명 내외)
- **비밀번호로 입장**, 개인 로그인 없이 **이름만으로 구분**
- **하루 단위** 시간표, 일정마다 시작·종료 시간을 지정해 긴 일정도 등록
- **모두 비는 시간 강조** 등 비교 기능
- **한/일/영 UI + 일정 내용 자동 번역**(LibreTranslate, 선택)

## 기술 스택
Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase(Postgres) · next-intl · LibreTranslate

---

## 로컬 실행

### 1) Supabase 준비
1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **SQL Editor** 에서 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 내용을 붙여넣어 실행 (테이블 + RLS)
3. **Settings → API** 에서 아래 두 값을 확인
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` (또는 `secret`) 키 → `SUPABASE_SERVICE_ROLE_KEY` *(서버 전용, 절대 노출 금지)*

### 2) 환경변수
[`.env.example`](.env.example) 을 참고해 `.env.local` 을 채운다. (설치 시 `SESSION_SECRET` 은 자동 생성되어 있음)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # service_role 키
SESSION_SECRET=<긴 랜덤 문자열>            # 이미 생성됨
LIBRETRANSLATE_URL=                        # 선택 (아래 참고)
LIBRETRANSLATE_API_KEY=                    # 선택
```

### 3) 실행
```bash
npm install      # 이미 완료
npm run dev      # http://localhost:3000
```

---

## 내용 번역 (선택 · LibreTranslate)
`LIBRETRANSLATE_URL` 이 비어 있으면 번역 없이 **원문만** 저장/표시된다(정상 동작).
한/일/영 번역을 켜려면 오픈소스 [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) 를 띄우고 URL을 넣는다.

```bash
# Docker 로 자체 호스팅 (한·일·영 모델만 로드 → 메모리 절약)
docker run -d -p 5000:5000 -e LT_LOAD_ONLY=en,ko,ja libretranslate/libretranslate
# → .env.local: LIBRETRANSLATE_URL=http://localhost:5000
```
> 배포 시엔 항상 켜져 있는 호스트(Fly.io / Railway / VPS)에 올리고, 앱 서버만 접근하도록 API 키로 잠근다.
> ko↔ja 는 영어를 경유해 번역되어 짧은 제목엔 무난하나 품질이 완벽하진 않다. 번역 실패 시 원문으로 자동 대체된다.

---

## 배포 (Vercel + Supabase)
1. 이 폴더를 GitHub 저장소로 push
2. [Vercel](https://vercel.com) 에서 import → 위 환경변수 4~6개 등록 → Deploy
3. Supabase는 이미 호스티드이므로 그대로 사용, 번역 서버(선택)만 별도 호스트

---

## 동작 방식 (요약)
- 클라이언트는 DB에 직접 접근하지 않는다. **모든 DB 접근은 서버 라우트에서 service 키로만** 수행하고,
  테이블은 RLS를 켜되 정책을 두지 않아(anon 차단) 서버 경유만 허용한다.
- 입장 = 비밀번호(bcrypt) 대조 성공 시 **httpOnly 서명 쿠키**(jose) 발급. 이후 요청은 쿠키의 `project_id` 로 게이트.
- 시간표는 5초 폴링으로 갱신(실시간 소켓 대신). 일정 제목은 저장 시 3개 언어로 번역해 `events.translations` JSONB에 캐싱.

## 주요 파일
| 경로 | 역할 |
|---|---|
| [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) | 테이블 + RLS |
| [`src/lib/db.ts`](src/lib/db.ts) · [`session.ts`](src/lib/session.ts) · [`translate.ts`](src/lib/translate.ts) | DB·세션·번역 |
| [`src/app/api/`](src/app/api/) | 생성/입장/보드/멤버/이벤트 API |
| [`src/app/project/[id]/`](src/app/project) | 프로젝트 페이지·입장 프롬프트·컨테이너 |
| [`src/components/Timetable.tsx`](src/components/Timetable.tsx) | 시간표 그리드·겹침·비교 강조 |
| [`messages/`](messages) · [`src/i18n/request.ts`](src/i18n/request.ts) | 한/일/영 UI |

## 검증 체크리스트
1. 홈에서 프로젝트 생성(이름+비번) → `/project/{id}` 이동
2. 시크릿창/다른 브라우저에서 같은 링크 열기 → 비번 입장(틀린 비번은 거부)
3. 이름 2~3개 추가 → 각 이름으로 일정 등록(시작·종료) → 사람별 열에 스팬 표시
4. "모두 비는 시간" 토글 → 전원 비는 시간대만 강조 / 날짜 이동 시 해당 날짜만 조회
5. 우측 언어 선택으로 한↔일↔영 전환 → UI + (번역 서버 설정 시) 일정 제목까지 번역
