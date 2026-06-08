# STEP 07 - Modul Auction

## Tujuan
Membuat sistem lelang untuk jersey yang sudah verified.

## Data Auction
- jersey_id
- start_price
- current_price
- min_increment
- start_time
- end_time
- status
- winner_user_id

## Status Auction
```txt
upcoming
live
ending_soon
closed
cancelled
sold
```

## Endpoint
```txt
GET    /api/auctions
GET    /api/auctions/live
GET    /api/auctions/upcoming
GET    /api/auctions/:id
POST   /api/admin/auctions
PATCH  /api/admin/auctions/:id
PATCH  /api/admin/auctions/:id/cancel
POST   /api/admin/auctions/:id/close
```

## Aturan Auction
- Hanya jersey verified yang bisa dilelang
- Auction upcoming jika waktu mulai belum tiba
- Auction live jika sudah mulai dan belum selesai
- Auction closed jika waktu selesai sudah lewat
- Winner adalah bid tertinggi terakhir

## Prompt Coding
Buatkan modul Auction untuk website lelang jersey. Admin dapat membuat auction dari jersey verified, mengatur harga awal, minimal increment, waktu mulai, waktu selesai, status auction, dan sistem dapat membaca live/upcoming/closed auction.

## Acceptance Criteria
- Admin bisa membuat auction
- Auction tampil di public list
- Detail auction menampilkan countdown
- Status berubah berdasarkan waktu
