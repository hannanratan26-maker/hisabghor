create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_by text,
  shop_id uuid references public.shops(id) on delete cascade,
  receipt_no text not null,
  sale_type text not null default 'product',
  payment_method text not null default 'cash',
  item_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  items_summary text,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  delivery_charge numeric not null default 0,
  total numeric not null default 0,
  paid numeric not null default 0,
  due numeric not null default 0,
  profit numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  employee_name text,
  employee_phone text,
  note text,
  photo_url text,
  sale_date timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;

alter table public.sales enable row level security;

drop policy if exists "own sales" on public.sales;
create policy "own sales" on public.sales to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_sales_shop on public.sales(shop_id);
create index if not exists idx_sales_date on public.sales(sale_date desc);

drop trigger if exists t_sales_upd on public.sales;
create trigger t_sales_upd before update on public.sales
  for each row execute function public.touch_updated_date();