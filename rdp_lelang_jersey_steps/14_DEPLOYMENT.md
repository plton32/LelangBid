# STEP 14 - Deployment

## Tujuan
Menjalankan website secara online.

## Environment Frontend
```env
VITE_API_URL=https://backend-domain.com/api
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

## Environment Backend
```env
PORT=5000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
JWT_SECRET=random_string_min_32_character
FRONTEND_URL=https://frontend-domain.com
```

## Deploy Frontend ke Vercel
1. Push frontend ke GitHub
2. Import ke Vercel
3. Set environment variable
4. Build command: `npm run build`
5. Output directory: `dist`

## Deploy Backend ke Railway/Render/VPS
1. Push backend ke GitHub
2. Set environment variable
3. Build command: `npm run build`
4. Start command: `npm run start`

## Supabase Storage Bucket
- `jersey-images`
- `payment-proofs`
- `certificates`

## Prompt Coding
Buatkan konfigurasi deployment untuk frontend React Vite dan backend Node Express. Siapkan environment variables, script build/start, CORS frontend domain, Supabase storage bucket, dan instruksi deploy ke Vercel untuk frontend serta Railway/Render/VPS untuk backend.

## Acceptance Criteria
- Frontend online
- Backend online
- Frontend bisa akses API backend
- Upload file berjalan
- Bid berjalan di production
