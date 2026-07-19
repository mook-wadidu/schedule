-- 시간 단위 공유 플래너 — 초기 스키마
-- Supabase(Postgres 15+)에서 실행. gen_random_uuid()는 코어에 포함되어 별도 확장 불필요.

-- 프로젝트: 생성자가 비밀번호 설정. 표시 시간 범위 포함.
create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  password_hash      text not null,
  visible_start_hour int  not null default 8  check (visible_start_hour between 0 and 23),
  visible_end_hour   int  not null default 22 check (visible_end_hour   between 1 and 24),
  created_at         timestamptz not null default now()
);

-- 멤버: 로그인 없이 이름만으로 구분. (project_id, name) 유니크.
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  color      text not null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

-- 이벤트(일정): 하루 단위, 시작~종료 시간(1시간 블록). 번역은 JSONB 캐시.
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  member_id   uuid not null references members(id)  on delete cascade,
  date        date not null,
  start_hour  int  not null check (start_hour between 0 and 23),
  end_hour    int  not null check (end_hour between 1 and 24 and end_hour > start_hour),
  title       text not null,
  source_lang text not null default 'ko',
  translations jsonb not null default '{}'::jsonb,   -- {"ko":"...","ja":"...","en":"..."}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_project_date_idx on events (project_id, date);
create index if not exists members_project_idx      on members (project_id);

-- RLS on + 정책 없음(deny all): anon/publishable 키로는 아무 접근도 못 함.
-- 모든 접근은 서버 라우트에서 service(secret) 키로만 수행 → RLS 우회.
alter table projects enable row level security;
alter table members  enable row level security;
alter table events   enable row level security;
