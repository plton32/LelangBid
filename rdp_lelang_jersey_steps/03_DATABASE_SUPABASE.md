# STEP 03 - Database Supabase

## Tujuan
Membuat struktur database untuk website lelang jersey.

## Tabel Utama
1. users
2. sellers
3. categories
4. jerseys
5. jersey_images
6. auctions
7. bids
8. auto_bids
9. auction_winners
10. payments
11. shipments
12. certificates
13. notifications
14. activity_logs

## SQL Dasar
```sql
create table public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  phone text,
  password_hash text,
  role text default 'member',
  status text default 'active',
  created_at timestamptz default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

create table public.jerseys (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  seller_id uuid references public.users(id),
  title text not null,
  player_name text,
  club_name text,
  league_name text,
  season text,
  size text,
  condition text,
  jersey_type text,
  is_signed boolean default false,
  has_coa boolean default false,
  description text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table public.jersey_images (
  id uuid primary key default gen_random_uuid(),
  jersey_id uuid references public.jerseys(id) on delete cascade,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  jersey_id uuid references public.jerseys(id) on delete cascade,
  start_price numeric not null,
  current_price numeric default 0,
  min_increment numeric default 50000,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'upcoming',
  winner_user_id uuid references public.users(id),
  created_at timestamptz default now()
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id) on delete cascade,
  user_id uuid references public.users(id),
  bid_amount numeric not null,
  created_at timestamptz default now()
);

create table public.auction_winners (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id),
  user_id uuid references public.users(id),
  final_price numeric not null,
  status text default 'waiting_payment',
  payment_deadline timestamptz,
  created_at timestamptz default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid references public.auction_winners(id),
  user_id uuid references public.users(id),
  amount numeric not null,
  proof_image_url text,
  status text default 'waiting_upload',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid references public.auction_winners(id),
  recipient_name text,
  address text,
  courier text,
  tracking_number text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  jersey_id uuid references public.jerseys(id),
  coa_number text unique not null,
  qr_code_url text,
  verifier_name text,
  status text default 'valid',
  created_at timestamptz default now()
);
```

## Prompt Coding
Buatkan migration SQL Supabase untuk database website lelang jersey premium. Buat tabel users, categories, jerseys, jersey_images, auctions, bids, auction_winners, payments, shipments, certificates, notifications, dan activity_logs. Tambahkan relasi foreign key, status default, created_at, dan index untuk auction_id, user_id, jersey_id.

## Acceptance Criteria
- SQL bisa dijalankan tanpa error
- Semua tabel utama terbentuk
- Relasi antar tabel benar
- Tabel bids dapat menyimpan riwayat bid
