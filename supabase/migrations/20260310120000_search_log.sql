-- Search query logging for admin analytics
create table if not exists search_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  search_type text not null,
  result_count int,
  created_at timestamptz default now()
);

create index if not exists idx_search_log_user on search_log(user_id, created_at desc);
create index if not exists idx_search_log_created on search_log(created_at desc);

alter table search_log enable row level security;

create policy "Admin full access to search_log"
  on search_log for all
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.is_admin = true
    )
  );

create policy "Service role full access to search_log"
  on search_log for all
  using (auth.role() = 'service_role');
