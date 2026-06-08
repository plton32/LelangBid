# STEP 15 - Urutan Prompt Coding Lengkap

Gunakan prompt ini satu per satu di AI coding tool seperti Cursor, Codex, Claude, atau AI Studio.

## Prompt 1 - Setup Frontend
Buatkan project React Vite TypeScript untuk website lelang jersey premium. Gunakan TailwindCSS, React Router DOM, struktur folder modular, layout public dan dashboard, serta routing awal untuk Home, Auction List, Auction Detail, Login, Register, User Dashboard, Seller Dashboard, dan Admin Dashboard.

## Prompt 2 - UI Component
Buatkan UI premium untuk website lelang jersey dengan React + TailwindCSS. Buat komponen reusable Button, Input, Card, Badge, Modal, Countdown, AuctionCard, BidBox, BidHistory, dan AuctionTimer. Tampilan responsive dan modern.

## Prompt 3 - Database
Buatkan migration SQL Supabase untuk database website lelang jersey premium. Buat tabel users, categories, jerseys, jersey_images, auctions, bids, auction_winners, payments, shipments, certificates, notifications, dan activity_logs. Tambahkan relasi foreign key, status default, created_at, dan index.

## Prompt 4 - Backend Setup
Buatkan backend Node.js Express TypeScript untuk website lelang jersey. Gunakan Supabase client, JWT auth, middleware role, routes modular, controller-service pattern, dan endpoint awal untuk auth, auctions, bids, payments, shipments, dan admin.

## Prompt 5 - Authentication
Buatkan sistem authentication menggunakan Node Express, Supabase PostgreSQL, bcryptjs, dan JWT. Buat endpoint register, login, me, middleware auth, middleware role guard, dan AuthContext React.

## Prompt 6 - Jersey Module
Buatkan modul Jersey Product. Admin dan seller dapat tambah/edit/hapus jersey, upload banyak foto, mengatur status draft/pending/verified/rejected, dan menampilkan data jersey di dashboard admin. Gunakan Supabase Storage.

## Prompt 7 - Auction Module
Buatkan modul Auction. Admin dapat membuat auction dari jersey verified, mengatur harga awal, minimal increment, waktu mulai, waktu selesai, status auction, dan sistem membaca live/upcoming/closed auction.

## Prompt 8 - Realtime Bid
Buatkan modul realtime bidding. Buat endpoint bid dengan validasi harga, status auction, minimal increment, update current_price, simpan bid history, subscribe realtime frontend, dan anti sniper extend 2 menit.

## Prompt 9 - Winner Payment Shipment
Buatkan modul winner, payment, dan shipment. Saat auction selesai, sistem menentukan pemenang dari bid tertinggi. User upload bukti pembayaran. Admin verifikasi pembayaran dan input resi.

## Prompt 10 - COA Certificate
Buatkan modul Certificate of Authenticity. Admin/verificator dapat membuat COA, generate nomor COA unik, generate QR Code, dan halaman public verification berdasarkan coa_number.

## Prompt 11 - Admin Panel
Buatkan admin panel dengan sidebar, topbar, dashboard statistik, tabel users, jerseys, auctions, payments, shipments, certificates. Admin dapat edit status, verifikasi pembayaran, input resi, dan melihat laporan omzet.

## Prompt 12 - Seller Center
Buatkan Seller Center. Seller dapat tambah jersey, upload foto, mengirim listing untuk verifikasi, melihat status jersey, melihat auction miliknya, dan melihat hasil penjualan.

## Prompt 13 - Notifications Reports
Buatkan modul notifications dan reports. Sistem membuat notifikasi saat bid, kalah bid, menang lelang, pembayaran diterima/ditolak, dan barang dikirim. Admin dapat export CSV.

## Prompt 14 - Deployment
Buatkan konfigurasi deployment frontend React Vite dan backend Node Express. Siapkan env, script build/start, CORS, Supabase storage bucket, dan instruksi deploy ke Vercel serta Railway/Render/VPS.
