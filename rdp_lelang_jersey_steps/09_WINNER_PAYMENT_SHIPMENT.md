# STEP 09 - Winner, Payment, Shipment

## Tujuan
Mengelola pemenang lelang, pembayaran, dan pengiriman.

## Alur Winner
1. Auction closed
2. Sistem cari bid tertinggi
3. Buat data auction_winners
4. Set status waiting_payment
5. Buat payment deadline 24 jam

## Status Winner
```txt
waiting_payment
payment_uploaded
payment_verified
payment_rejected
cancelled
shipped
completed
```

## Payment
User upload bukti transfer.

### Endpoint Payment
```txt
GET  /api/users/me/winnings
POST /api/payments/:winner_id/upload-proof
PATCH /api/admin/payments/:id/verify
PATCH /api/admin/payments/:id/reject
```

## Shipment
Admin input pengiriman setelah pembayaran diterima.

### Endpoint Shipment
```txt
POST  /api/admin/shipments
PATCH /api/admin/shipments/:id
GET   /api/users/me/shipments
```

## Prompt Coding
Buatkan modul winner, payment, dan shipment untuk website lelang jersey. Saat auction selesai, sistem menentukan pemenang dari bid tertinggi. User pemenang dapat upload bukti pembayaran. Admin dapat verifikasi pembayaran, menolak pembayaran, membuat data pengiriman, input kurir dan nomor resi.

## Acceptance Criteria
- Winner otomatis terbentuk
- User bisa melihat auction yang dimenangkan
- User bisa upload bukti pembayaran
- Admin bisa verifikasi pembayaran
- Admin bisa input resi
