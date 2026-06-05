-- Configurable shop settings (local pickup location, etc.)

create table if not exists public.shop_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.shop_settings is 'Key/value shop configuration (pickup location, etc.).';

alter table public.shop_settings enable row level security;

drop policy if exists "Anyone can read shop settings" on public.shop_settings;
create policy "Anyone can read shop settings"
on public.shop_settings
for select
to authenticated, anon
using (true);

revoke insert, update, delete on public.shop_settings from authenticated, anon;

insert into public.shop_settings (key, value)
values (
  'local_pickup',
  jsonb_build_object(
    'name', 'Crimson Society Pickup',
    'area', 'San Antonio, TX',
    'public_preview', 'Local pickup in San Antonio. We''ll send pickup details once your order is ready.',
    'instructions', 'We''ll message you when your order is ready. Pickup details will be shown after confirmation.',
    'hours', 'By appointment only',
    'contact_note', 'Reply to your order confirmation email if you need to reschedule pickup.'
  )
)
on conflict (key) do nothing;
