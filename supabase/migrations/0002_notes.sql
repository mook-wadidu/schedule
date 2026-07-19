-- "오늘의 한 마디" — 멤버·날짜당 1개의 짧은 메시지.
create table if not exists notes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  member_id    uuid not null references members(id)  on delete cascade,
  date         date not null,
  message      text not null,
  source_lang  text not null default 'ko',
  translations jsonb not null default '{}'::jsonb,   -- {"ko":"...","ja":"...","en":"..."}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (member_id, date)     -- 멤버·날짜당 1개 (upsert 대상)
);

create index if not exists notes_project_date_idx on notes (project_id, date);

-- RLS on + 정책 없음: 서버(service key)만 접근. 다른 테이블과 동일.
alter table notes enable row level security;
