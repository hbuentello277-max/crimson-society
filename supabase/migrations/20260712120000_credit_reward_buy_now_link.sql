-- Link credit-reward catalog rows to purchasable merch products for Buy Now fallback.

alter table public.products
  add column if not exists linked_merch_product_id uuid references public.products(id) on delete set null;

create index if not exists products_linked_merch_product_id_idx
  on public.products (linked_merch_product_id)
  where linked_merch_product_id is not null;

comment on column public.products.linked_merch_product_id is
  'Optional cash_product used when a member cannot redeem a credit reward with credits (Buy Now).';
