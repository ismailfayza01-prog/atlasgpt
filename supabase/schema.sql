-- Atlas Parcel Europe — Supabase schema (MVP)
-- Run in Supabase SQL editor.

-- Enable required extensions
create extension if not exists pgcrypto;

-- Roles
do $$ begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type role_type as enum ('admin','agent','customer','rider');
  end if;
  if not exists (select 1 from pg_type where typname = 'shipment_status') then
    create type shipment_status as enum ('requested','created','picked_up','in_transit','out_for_delivery','delivered','cancelled');
  end if;
end $$;

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role role_type not null default 'customer',
  is_disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- Shipments
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  origin text,
  destination text,
  status shipment_status not null default 'created',
  weight_kg numeric,
  price_amount numeric,
  currency text default 'MAD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipments_customer_idx on public.shipments (customer_id);
create index if not exists shipments_status_idx on public.shipments (status);

-- Shipment events (history)
create table if not exists public.shipment_events (
  id bigserial primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status shipment_status not null,
  location text,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_idx on public.shipment_events (shipment_id);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  number text not null unique,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz not null default now()
);

-- Labels (optional metadata)
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  pdf_url text,
  created_at timestamptz not null default now()
);

-- Rider GPS positions
create table if not exists public.rider_positions (
  id bigserial primary key,
  rider_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  speed_mps double precision,
  heading_deg double precision,
  recorded_at timestamptz not null default now()
);

create index if not exists rider_positions_rider_time_idx on public.rider_positions (rider_id, recorded_at desc);

-- ---------- Triggers & helper functions ----------

-- Keep profiles.email in sync with auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    'customer'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Update shipments.updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
before update on public.shipments
for each row execute procedure public.set_updated_at();

-- Auto-add event when status changes
create or replace function public.shipment_status_event()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into public.shipment_events (shipment_id, status, actor_id, note)
    values (new.id, new.status, auth.uid(), 'Status changed');
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_status_event on public.shipments;
create trigger shipments_status_event
after update on public.shipments
for each row execute procedure public.shipment_status_event();

-- Invoice number generator
create sequence if not exists public.invoice_seq;

create or replace function public.ensure_invoice_for_shipment(in_shipment_id uuid)
returns public.invoices
language plpgsql
security definer
as $$
declare
  inv public.invoices;
  next_no bigint;
begin
  select * into inv from public.invoices where shipment_id = in_shipment_id;
  if found then
    return inv;
  end if;

  next_no := nextval('public.invoice_seq');
  insert into public.invoices (shipment_id, number)
  values (in_shipment_id, 'INV-' || lpad(next_no::text, 6, '0'))
  returning * into inv;

  return inv;
end;
$$;

-- Latest rider positions (one per rider) for dispatch
create or replace function public.latest_rider_positions()
returns table (
  rider_id uuid,
  id bigint,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  speed_mps double precision,
  heading_deg double precision,
  recorded_at timestamptz
)
language sql
stable
as $$
  select distinct on (rp.rider_id)
    rp.rider_id, rp.id, rp.lat, rp.lng, rp.accuracy_m, rp.speed_mps, rp.heading_deg, rp.recorded_at
  from public.rider_positions rp
  order by rp.rider_id, rp.recorded_at desc;
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.invoices enable row level security;
alter table public.labels enable row level security;
alter table public.rider_positions enable row level security;

-- Helpers: role checks
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_disabled = false);
$$;

create or replace function public.is_agent_or_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent') and p.is_disabled = false);
$$;

create or replace function public.is_rider()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rider' and p.is_disabled = false);
$$;

-- Profiles policies
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
using (auth.uid() = id or public.is_agent_or_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- Shipments policies
drop policy if exists "shipments_select" on public.shipments;
create policy "shipments_select"
on public.shipments for select
using (
  public.is_agent_or_admin()
  or (customer_id = auth.uid())
);

drop policy if exists "shipments_insert_customer_or_staff" on public.shipments;
create policy "shipments_insert_customer_or_staff"
on public.shipments for insert
with check (
  public.is_agent_or_admin()
  or (customer_id = auth.uid())
  or (customer_id is null and public.is_agent_or_admin())
);

drop policy if exists "shipments_update_staff_or_owner" on public.shipments;
create policy "shipments_update_staff_or_owner"
on public.shipments for update
using (
  public.is_agent_or_admin()
  or (customer_id = auth.uid())
)
with check (
  public.is_agent_or_admin()
  or (customer_id = auth.uid())
);

drop policy if exists "shipments_delete_staff" on public.shipments;
create policy "shipments_delete_staff"
on public.shipments for delete
using (public.is_agent_or_admin());

-- Shipment events policies
drop policy if exists "events_select" on public.shipment_events;
create policy "events_select"
on public.shipment_events for select
using (
  public.is_agent_or_admin()
  or exists(select 1 from public.shipments s where s.id = shipment_id and s.customer_id = auth.uid())
);

drop policy if exists "events_insert_staff" on public.shipment_events;
create policy "events_insert_staff"
on public.shipment_events for insert
with check (public.is_agent_or_admin());

-- Invoices / Labels policies (staff can create/read; customer can read own if attached)
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select"
on public.invoices for select
using (
  public.is_agent_or_admin()
  or exists(select 1 from public.shipments s where s.id = shipment_id and s.customer_id = auth.uid())
);

drop policy if exists "invoices_insert_staff" on public.invoices;
create policy "invoices_insert_staff"
on public.invoices for insert
with check (public.is_agent_or_admin());

drop policy if exists "invoices_update_staff" on public.invoices;
create policy "invoices_update_staff"
on public.invoices for update
using (public.is_agent_or_admin())
with check (public.is_agent_or_admin());

drop policy if exists "labels_select" on public.labels;
create policy "labels_select"
on public.labels for select
using (
  public.is_agent_or_admin()
  or exists(select 1 from public.shipments s where s.id = shipment_id and s.customer_id = auth.uid())
);

drop policy if exists "labels_insert_staff" on public.labels;
create policy "labels_insert_staff"
on public.labels for insert
with check (public.is_agent_or_admin());

drop policy if exists "labels_update_staff" on public.labels;
create policy "labels_update_staff"
on public.labels for update
using (public.is_agent_or_admin())
with check (public.is_agent_or_admin());

-- Rider positions policies
drop policy if exists "rider_positions_select_staff" on public.rider_positions;
create policy "rider_positions_select_staff"
on public.rider_positions for select
using (public.is_agent_or_admin() or (rider_id = auth.uid()));

drop policy if exists "rider_positions_insert_rider" on public.rider_positions;
create policy "rider_positions_insert_rider"
on public.rider_positions for insert
with check (public.is_rider() and rider_id = auth.uid());
