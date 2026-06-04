-- Shop product images: public read, admin-only write via authenticated admin session or service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-product-images',
  'shop-product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Shop product images are public" on storage.objects;
create policy "Shop product images are public"
on storage.objects
for select
to public
using (bucket_id = 'shop-product-images');

drop policy if exists "Admins can upload shop product images" on storage.objects;
create policy "Admins can upload shop product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shop-product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

drop policy if exists "Admins can update shop product images" on storage.objects;
create policy "Admins can update shop product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shop-product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
)
with check (
  bucket_id = 'shop-product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

drop policy if exists "Admins can delete shop product images" on storage.objects;
create policy "Admins can delete shop product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'shop-product-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

-- Default Blackcard plan perk copy (monthly + yearly cards)
update public.membership_plans
set perks = array[
  'Earn Crimson Credits through meets and referrals',
  'Redeem future Blackcard member rewards (coming soon)',
  'Early merch access',
  'Blackcard merch discount',
  'Exclusive meets and ride chats',
  'Limited inventory access',
  'Merch voting access'
]::text[]
where plan_type in ('monthly', 'yearly');
