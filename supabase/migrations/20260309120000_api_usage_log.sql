-- API usage tracking for cost monitoring (OpenAI, Serper)
create table if not exists api_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  service text not null,
  model text,
  feature text not null,
  tokens_in int,
  tokens_out int,
  estimated_cost_usd numeric(10,6),
  duration_ms int,
  created_at timestamptz default now()
);

create index if not exists idx_api_usage_log_user on api_usage_log(user_id);
create index if not exists idx_api_usage_log_created on api_usage_log(created_at);
create index if not exists idx_api_usage_log_service on api_usage_log(service, created_at);

alter table api_usage_log enable row level security;

create policy "Admin full access to api_usage_log"
  on api_usage_log for all
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.is_admin = true
    )
  );

create policy "Service role full access to api_usage_log"
  on api_usage_log for all
  using (auth.role() = 'service_role');
