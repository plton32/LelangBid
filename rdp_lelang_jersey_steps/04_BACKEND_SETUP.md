# STEP 04 - Setup Backend Node Express

## Tujuan
Membuat backend API untuk website lelang jersey.

## Perintah Awal
```bash
mkdir jersey-auction-backend
cd jersey-auction-backend
npm init -y
npm install express cors dotenv bcryptjs jsonwebtoken multer @supabase/supabase-js zod
npm install -D typescript ts-node-dev @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/multer
npx tsc --init
```

## Struktur Folder Backend
```txt
src/
├── config/
│   └── supabase.ts
├── middleware/
│   ├── auth.ts
│   └── role.ts
├── routes/
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   ├── jerseys.routes.ts
│   ├── auctions.routes.ts
│   ├── bids.routes.ts
│   ├── payments.routes.ts
│   ├── shipments.routes.ts
│   └── admin.routes.ts
├── controllers/
├── services/
├── utils/
└── server.ts
```

## Endpoint Utama
```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/auctions
GET  /api/auctions/:id
POST /api/auctions
POST /api/auctions/:id/bid
GET  /api/users/me/bids
GET  /api/users/me/winnings
POST /api/payments/upload-proof
PATCH /api/admin/payments/:id/verify
PATCH /api/admin/shipments/:id
```

## Prompt Coding
Buatkan backend Node.js Express TypeScript untuk website lelang jersey. Gunakan Supabase client, JWT auth, middleware role, routes modular, controller-service pattern, dan endpoint awal untuk auth, auctions, bids, payments, shipments, dan admin.

## Acceptance Criteria
- Server berjalan dengan `npm run dev`
- Endpoint health check aktif
- Auth middleware membaca JWT
- Struktur route modular
