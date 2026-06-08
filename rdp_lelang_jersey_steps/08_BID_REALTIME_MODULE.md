# STEP 08 - Modul Bid Realtime

## Tujuan
Membuat user dapat melakukan bid secara realtime.

## Aturan Bid
- User harus login
- Auction harus live
- Bid harus lebih tinggi dari current_price
- Bid minimal naik sesuai min_increment
- User tidak boleh bid lebih rendah dari bid terakhir
- Setelah bid berhasil, current_price auction berubah

## Endpoint
```txt
POST /api/auctions/:id/bid
GET  /api/auctions/:id/bids
```

## Request Bid
```json
{
  "bid_amount": 1500000
}
```

## Response Bid
```json
{
  "success": true,
  "message": "Bid berhasil",
  "current_price": 1500000
}
```

## Realtime Event
Frontend subscribe ke perubahan tabel bids berdasarkan auction_id.

## Anti Sniper
Jika bid masuk dalam 1 menit terakhir, sistem menambah end_time +2 menit.

## Prompt Coding
Buatkan modul realtime bidding untuk auction jersey. Buat endpoint bid dengan validasi harga, status auction, minimal increment, update current_price, simpan bid history, dan subscribe realtime di frontend agar harga dan bid history berubah tanpa refresh. Tambahkan anti sniper extend 2 menit jika bid masuk pada 1 menit terakhir.

## Acceptance Criteria
- User bisa bid
- Bid rendah ditolak
- Bid history tersimpan
- Harga tertinggi update realtime
- Countdown extend jika anti sniper aktif
