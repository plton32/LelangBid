# MASTER RDP - Website Lelang Jersey Premium

## Konsep Utama
Website lelang jersey premium seperti Memorabid, fokus pada jersey original, match worn, match issued, signed jersey, COA, sistem bid realtime, pembayaran, pengiriman, dan dashboard admin.

## Alur Besar Sistem
Guest/User membuka website -> melihat daftar auction -> detail jersey -> login/register -> bid -> countdown selesai -> sistem menentukan pemenang -> user bayar -> admin verifikasi -> admin input resi -> transaksi selesai.

## Role Sistem
1. Guest
2. Member/User
3. Seller
4. Verificator
5. Admin
6. Superadmin

## Modul Utama
1. Authentication
2. User Profile
3. Jersey Product
4. Auction
5. Bid Realtime
6. Auto Bid
7. Winner Management
8. Payment
9. Shipment
10. Certificate of Authenticity / COA
11. Seller Center
12. Admin Panel
13. Notification
14. Report
15. Deployment

## Stack Rekomendasi
Frontend: React + Vite + TailwindCSS
Backend: Node.js + Express
Database: Supabase PostgreSQL
Storage: Supabase Storage
Realtime: Supabase Realtime / WebSocket
Payment: Midtrans/Xendit/manual transfer
Deployment Frontend: Vercel
Deployment Backend: Railway/Render/VPS

## MVP Versi 1
- Register/Login
- List Jersey Auction
- Detail Jersey
- Countdown Lelang
- Bid Manual
- Bid History
- Winner Otomatis
- Upload Bukti Pembayaran
- Admin Verifikasi Pembayaran
- Admin Input Resi
- Dashboard Admin

## Versi Lanjutan
- Auto Bid
- Anti Sniper
- Seller Center
- COA QR Code
- KYC User
- Notifikasi Email/WhatsApp
- Payment Gateway
- Mobile App
