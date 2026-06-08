# STEP 13 - Notification dan Report

## Tujuan
Membuat notifikasi dan laporan transaksi.

## Notification Event
- User berhasil bid
- User kalah bid
- User menang auction
- Payment deadline
- Pembayaran diterima
- Pembayaran ditolak
- Barang dikirim

## Tabel notifications
```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  title text not null,
  message text not null,
  type text,
  is_read boolean default false,
  created_at timestamptz default now()
);
```

## Reports
- Report auction
- Report sales
- Report payments
- Report shipments
- Export CSV/Excel

## Prompt Coding
Buatkan modul notifications dan reports untuk website lelang jersey. Sistem membuat notifikasi saat user bid, kalah bid, menang lelang, pembayaran diterima/ditolak, dan barang dikirim. Admin dapat melihat laporan auction, sales, payment, shipment, serta export CSV.

## Acceptance Criteria
- Notifikasi tersimpan
- User bisa melihat notifikasi
- Admin bisa melihat laporan
- Export CSV berjalan
