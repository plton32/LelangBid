# LelangBID Deployment

Panduan ini mengikuti Step 14 RDP untuk deploy frontend Vite dan backend Express.

## Prasyarat

- Node.js 22.5 atau lebih baru untuk backend karena proyek memakai `node:sqlite`.
- Backend membutuhkan persistent disk jika memakai SQLite dan upload file lokal.
- Frontend membutuhkan URL API production melalui `VITE_API_URL`.

## Environment Frontend

Buat environment variable berikut di Vercel atau file `.env` lokal:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`VITE_SUPABASE_*` disiapkan untuk jalur migrasi Supabase sesuai RDP, tetapi kode saat ini memakai backend Express.

## Environment Backend

Buat environment variable berikut di Railway, Render, atau VPS:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=replace_with_random_secret_minimum_32_characters
FRONTEND_URL=https://your-frontend-domain.com
PUBLIC_APP_URL=https://your-frontend-domain.com
DATABASE_PATH=/var/data/database.db
UPLOAD_DIR=/var/data/uploads
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`FRONTEND_URL` dan `FRONTEND_ORIGINS` mendukung format comma-separated jika perlu lebih dari satu origin.

## Supabase Storage Bucket

RDP menyiapkan target bucket berikut jika nanti upload dipindahkan dari local disk ke Supabase Storage:

- `jersey-images`
- `payment-proofs`
- `certificates`

Implementasi saat ini masih memakai `UPLOAD_DIR` lokal dari backend. Untuk production dengan kode sekarang, pastikan `UPLOAD_DIR` berada di persistent disk.

## Deploy Frontend ke Vercel

1. Import folder `jersey-auction-frontend` ke Vercel.
2. Set `VITE_API_URL` ke URL backend production dengan suffix `/api`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. `vercel.json` sudah menyiapkan fallback SPA ke `index.html`.

## Deploy Backend ke Render

1. Deploy dari folder `jersey-auction-backend`.
2. Gunakan Dockerfile yang sudah disediakan.
3. Set environment production sesuai daftar di atas.
4. Tambahkan persistent disk ke `/var/data`.
5. Health check path: `/api/health`.

`render.yaml` sudah memuat blueprint dasar dengan disk `/var/data`.

## Deploy Backend ke Railway

1. Deploy dari folder `jersey-auction-backend`.
2. Railway akan memakai `railway.json` dan `Dockerfile`.
3. Set `DATABASE_PATH` dan `UPLOAD_DIR` ke path volume/persistent storage jika tersedia.
4. Set `FRONTEND_URL` ke domain Vercel supaya CORS mengizinkan request.

## Deploy Backend ke VPS

```bash
cd jersey-auction-backend
npm ci
npm run build
NODE_ENV=production npm run start
```

Untuk VPS, simpan `DATABASE_PATH` dan `UPLOAD_DIR` di folder yang ikut backup, misalnya `/opt/lelangbid/data/database.db` dan `/opt/lelangbid/uploads`.

## Production Checklist

- Frontend `VITE_API_URL` mengarah ke backend production.
- Backend `FRONTEND_URL` mengarah ke domain frontend production.
- `JWT_SECRET` sudah random dan tidak memakai contoh lokal.
- SQLite database dan upload directory memakai persistent disk.
- Endpoint `/api/health` mengembalikan status OK.
- Upload jersey dan payment proof dapat diakses lewat `/uploads/<filename>`.
