# STEP 02 - Desain UI Frontend

## Tujuan
Membuat tampilan premium seperti marketplace lelang memorabilia.

## Gaya UI
- Modern premium
- Background putih/slate
- Card rounded-2xl
- Shadow halus
- Warna utama navy/blue/gold
- Mobile responsive

## Komponen UI
```txt
components/ui/
├── Button.tsx
├── Input.tsx
├── Card.tsx
├── Badge.tsx
├── Modal.tsx
├── Countdown.tsx
├── EmptyState.tsx
├── Loading.tsx
└── Pagination.tsx
```

## Komponen Auction
```txt
components/auction/
├── AuctionCard.tsx
├── AuctionGrid.tsx
├── BidBox.tsx
├── BidHistory.tsx
├── AuctionStatusBadge.tsx
└── AuctionTimer.tsx
```

## Halaman Public
1. Home
2. Live Auctions
3. Upcoming Auctions
4. Auction Detail
5. About
6. Contact

## Prompt Coding
Buatkan UI premium untuk website lelang jersey dengan React + TailwindCSS. Buat komponen reusable Button, Input, Card, Badge, Modal, Countdown, AuctionCard, BidBox, BidHistory, dan AuctionTimer. Tampilan harus responsive, modern, dan cocok untuk marketplace jersey memorabilia premium.

## Acceptance Criteria
- Home menampilkan hero section
- Auction list menampilkan card jersey
- Detail auction menampilkan galeri foto, info jersey, countdown, bid box, dan bid history
- Responsive di mobile
