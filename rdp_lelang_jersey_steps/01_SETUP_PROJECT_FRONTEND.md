# STEP 01 - Setup Project Frontend

## Tujuan
Membuat project frontend React + Vite + TailwindCSS untuk website lelang jersey.

## Perintah Awal
```bash
npm create vite@latest jersey-auction-frontend -- --template react-ts
cd jersey-auction-frontend
npm install
npm install react-router-dom axios lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Struktur Folder Frontend
```txt
src/
├── assets/
├── components/
│   ├── layout/
│   ├── ui/
│   ├── auction/
│   ├── jersey/
│   └── admin/
├── contexts/
├── hooks/
├── lib/
├── pages/
│   ├── public/
│   ├── auth/
│   ├── user/
│   ├── seller/
│   └── admin/
├── services/
├── types/
└── main.tsx
```

## File yang Dibuat
- `src/lib/api.ts`
- `src/lib/utils.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/layout/PublicLayout.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/pages/public/HomePage.tsx`
- `src/pages/public/AuctionListPage.tsx`
- `src/pages/public/AuctionDetailPage.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/RegisterPage.tsx`

## Prompt Coding
Buatkan project React Vite TypeScript untuk website lelang jersey premium. Gunakan TailwindCSS, React Router DOM, struktur folder modular, layout public dan dashboard, serta routing awal untuk Home, Auction List, Auction Detail, Login, Register, User Dashboard, Seller Dashboard, dan Admin Dashboard.

## Acceptance Criteria
- Project bisa berjalan dengan `npm run dev`
- Tailwind aktif
- Routing berjalan
- Layout public dan dashboard sudah terpisah
- Belum perlu koneksi backend
