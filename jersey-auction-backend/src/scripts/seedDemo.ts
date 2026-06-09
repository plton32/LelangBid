import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import db, { initDb } from '../config/db';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const demoId = (name: string) => `demo-${name}`;
const demoProofUrl = '/uploads/demo-payment-proof.svg';

type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'member' | 'seller' | 'admin';
  status: 'active' | 'suspended';
  depositBalance?: number;
};

type DemoCategory = {
  id: string;
  name: string;
  slug: string;
};

type DemoJersey = {
  id: string;
  categorySlug: string;
  sellerId: string;
  title: string;
  playerName: string;
  clubName: string;
  leagueName: string;
  season: string;
  size: string;
  condition: string;
  jerseyType: string;
  isSigned: number;
  hasCoa: number;
  description: string;
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected';
  images: string[];
};

type DemoAuction = {
  id: string;
  jerseyId: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  startTime: string;
  endTime: string;
  status: 'live' | 'upcoming' | 'closed';
  winnerUserId?: string | null;
};

type DemoBid = {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  createdAt: string;
};

type DemoWinner = {
  id: string;
  auctionId: string;
  userId: string;
  finalPrice: number;
  status: 'waiting_payment' | 'waiting_verification' | 'paid' | 'shipped' | 'completed';
  paymentDeadline: string;
};

const image = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1000&auto=format&fit=crop`;

function hashPassword(password: string) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

function ensureUser(user: DemoUser) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email) as { id: string } | undefined;
  const passwordHash = hashPassword(user.password);

  if (existing) {
    db.prepare(`
      UPDATE users
      SET full_name = ?, phone = ?, password_hash = ?, role = ?, status = ?, deposit_balance = ?
      WHERE id = ?
    `).run(user.fullName, user.phone, passwordHash, user.role, user.status, user.depositBalance || 0, existing.id);
    return existing.id;
  }

  db.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, status, deposit_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.fullName, user.email, user.phone, passwordHash, user.role, user.status, user.depositBalance || 0);

  return user.id;
}

function ensureCategory(category: DemoCategory) {
  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category.slug) as { id: string } | undefined;

  if (existing) {
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(category.name, existing.id);
    return existing.id;
  }

  db.prepare('INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)').run(category.id, category.name, category.slug);
  return category.id;
}

function clearDemoData() {
  const statements = [
    "DELETE FROM notifications WHERE id LIKE 'demo-%'",
    "DELETE FROM deposits WHERE id LIKE 'demo-%' OR user_id LIKE 'demo-%'",
    "DELETE FROM shipments WHERE id LIKE 'demo-%' OR winner_id LIKE 'demo-%'",
    "DELETE FROM payments WHERE id LIKE 'demo-%' OR winner_id LIKE 'demo-%'",
    "DELETE FROM auction_winners WHERE id LIKE 'demo-%' OR auction_id LIKE 'demo-%'",
    "DELETE FROM bids WHERE id LIKE 'demo-%' OR auction_id LIKE 'demo-%'",
    "DELETE FROM certificates WHERE id LIKE 'demo-%' OR jersey_id LIKE 'demo-%'",
    "DELETE FROM auctions WHERE id LIKE 'demo-%' OR jersey_id LIKE 'demo-%'",
    "DELETE FROM jersey_images WHERE id LIKE 'demo-%' OR jersey_id LIKE 'demo-%'",
    "DELETE FROM jerseys WHERE id LIKE 'demo-%'",
    "DELETE FROM users WHERE id LIKE 'demo-user-extra-%'"
  ];

  statements.forEach(statement => db.prepare(statement).run());
}

function seedDemo() {
  initDb();
  clearDemoData();

  const users = {
    admin: ensureUser({
      id: demoId('user-admin'),
      fullName: 'Super Admin LelangBID',
      email: 'admin@lelangbid.com',
      phone: '081234567890',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      depositBalance: 0
    }),
    seller: ensureUser({
      id: demoId('user-seller'),
      fullName: 'Jersey Collector Seller',
      email: 'seller@lelangbid.com',
      phone: '081234567891',
      password: 'seller123',
      role: 'seller',
      status: 'active',
      depositBalance: 0
    }),
    seller2: ensureUser({
      id: demoId('user-extra-seller2'),
      fullName: 'Vintage Kit Room',
      email: 'seller2@lelangbid.com',
      phone: '081299887766',
      password: 'seller123',
      role: 'seller',
      status: 'active',
      depositBalance: 0
    }),
    member: ensureUser({
      id: demoId('user-member'),
      fullName: 'Andi Member',
      email: 'member@lelangbid.com',
      phone: '081234567892',
      password: 'member123',
      role: 'member',
      status: 'active',
      depositBalance: 2000000
    }),
    buyer2: ensureUser({
      id: demoId('user-extra-buyer2'),
      fullName: 'Raka Bid Hunter',
      email: 'buyer@lelangbid.com',
      phone: '081355557777',
      password: 'member123',
      role: 'member',
      status: 'active',
      depositBalance: 0
    }),
    buyer3: ensureUser({
      id: demoId('user-extra-buyer3'),
      fullName: 'Dimas Kit Collector',
      email: 'collector@lelangbid.com',
      phone: '081366668888',
      password: 'member123',
      role: 'member',
      status: 'active',
      depositBalance: 1500000
    }),
    suspended: ensureUser({
      id: demoId('user-extra-suspended'),
      fullName: 'Suspended Demo User',
      email: 'suspended@lelangbid.com',
      phone: '081377779999',
      password: 'member123',
      role: 'member',
      status: 'suspended',
      depositBalance: 0
    })
  };

  [
    { userId: users.member, amount: 2000000 },
    { userId: users.buyer3, amount: 1500000 }
  ].forEach(deposit => {
    db.prepare(`
      INSERT INTO deposits (id, user_id, amount, status, method, proof_image_url, verified_by, verified_at, created_at)
      VALUES (?, ?, ?, 'verified', 'demo_seed', ?, ?, ?, ?)
    `).run(demoId(`deposit-${deposit.userId}`), deposit.userId, deposit.amount, demoProofUrl, users.admin, iso(-2 * DAY), iso(-2 * DAY));
  });

  db.prepare(`
    INSERT INTO deposit_bank_accounts (id, bank_name, account_number, account_holder_name, instructions, is_active, updated_at)
    VALUES ('primary', 'BCA', '1234567890', 'PT LelangBID Indonesia', 'Transfer sesuai nominal deposit, lalu upload bukti transfer dari dashboard.', 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      bank_name = excluded.bank_name,
      account_number = excluded.account_number,
      account_holder_name = excluded.account_holder_name,
      instructions = excluded.instructions,
      is_active = 1,
      updated_at = excluded.updated_at
  `).run(iso(-2 * DAY));

  const categories = [
    { id: demoId('cat-classic'), name: 'Classic Jersey', slug: 'classic-jersey' },
    { id: demoId('cat-signed'), name: 'Signed Jersey', slug: 'signed-jersey' },
    { id: demoId('cat-match-worn'), name: 'Match Worn Jersey', slug: 'match-worn-jersey' },
    { id: demoId('cat-match-issued'), name: 'Match Issued Jersey', slug: 'match-issued-jersey' },
    { id: demoId('cat-national'), name: 'National Team Jersey', slug: 'national-team-jersey' }
  ];

  const categoryIds = new Map(categories.map(category => [category.slug, ensureCategory(category)]));

  const jerseys: DemoJersey[] = [
    {
      id: demoId('jersey-live-cr7'),
      categorySlug: 'match-worn-jersey',
      sellerId: users.seller,
      title: 'Manchester United 2007-08 Home - Match Worn Cristiano Ronaldo #7',
      playerName: 'Cristiano Ronaldo',
      clubName: 'Manchester United',
      leagueName: 'Premier League / UEFA Champions League',
      season: '2007-2008',
      size: 'L',
      condition: 'Match Worn - Excellent with pitch marks',
      jerseyType: 'match-worn-jersey',
      isSigned: 1,
      hasCoa: 1,
      description: 'Premium match worn collectible from a legendary double-winning season. Includes signature placement inspection, fabric wear notes, and LelangBID COA.',
      status: 'verified',
      images: [
        image('photo-1508098682722-e99c43a406b2'),
        image('photo-1517649763962-0c623066013b')
      ]
    },
    {
      id: demoId('jersey-live-messi'),
      categorySlug: 'signed-jersey',
      sellerId: users.seller,
      title: 'Barcelona 2014-15 Home - Signed Lionel Messi Treble Season',
      playerName: 'Lionel Messi',
      clubName: 'FC Barcelona',
      leagueName: 'La Liga / UEFA Champions League',
      season: '2014-2015',
      size: 'M',
      condition: 'Mint - Display framed condition',
      jerseyType: 'signed-jersey',
      isSigned: 1,
      hasCoa: 1,
      description: 'Signed Barcelona home shirt from the treble era. Perfect display piece with hologram verification record.',
      status: 'verified',
      images: [
        image('photo-1522778119026-d647f0596c20'),
        image('photo-1579952363873-27f3bade9f55')
      ]
    },
    {
      id: demoId('jersey-live-beckham'),
      categorySlug: 'classic-jersey',
      sellerId: users.seller2,
      title: 'England 2001 Home - David Beckham #7 Classic Qualifier Jersey',
      playerName: 'David Beckham',
      clubName: 'England National Team',
      leagueName: 'World Cup Qualifier',
      season: '2001',
      size: 'XL',
      condition: 'Very Good - minor age marks',
      jerseyType: 'classic-jersey',
      isSigned: 0,
      hasCoa: 0,
      description: 'Classic England home jersey inspired by the 2001 qualifier era. Clean print, strong collar shape, and vintage collector appeal.',
      status: 'verified',
      images: [
        image('photo-1574629810360-7efbbe195018'),
        image('photo-1508098682722-e99c43a406b2')
      ]
    },
    {
      id: demoId('jersey-upcoming-persib'),
      categorySlug: 'match-issued-jersey',
      sellerId: users.seller2,
      title: 'Persib Bandung 2023 Away - Match Issued Marc Klok #23',
      playerName: 'Marc Klok',
      clubName: 'Persib Bandung',
      leagueName: 'Liga 1 Indonesia',
      season: '2023-2024',
      size: 'L',
      condition: 'Match Issued - unused',
      jerseyType: 'match-issued-jersey',
      isSigned: 0,
      hasCoa: 1,
      description: 'Indonesia league match issued shirt with internal tagging and verification notes.',
      status: 'verified',
      images: [image('photo-1518091043644-c1d4457512c6')]
    },
    {
      id: demoId('jersey-upcoming-japan'),
      categorySlug: 'national-team-jersey',
      sellerId: users.seller,
      title: 'Japan 2022 Home - National Team Blue Samurai Collector Jersey',
      playerName: 'Kaoru Mitoma',
      clubName: 'Japan National Team',
      leagueName: 'World Cup',
      season: '2022',
      size: 'M',
      condition: 'Mint',
      jerseyType: 'classic-jersey',
      isSigned: 0,
      hasCoa: 0,
      description: 'National team collector jersey with excellent fabric and badge condition.',
      status: 'verified',
      images: [image('photo-1551958219-acbc608c6377')]
    },
    {
      id: demoId('jersey-closed-zidane'),
      categorySlug: 'classic-jersey',
      sellerId: users.seller,
      title: 'Real Madrid 2002 Centenary - Zinedine Zidane #5',
      playerName: 'Zinedine Zidane',
      clubName: 'Real Madrid',
      leagueName: 'La Liga',
      season: '2002-2003',
      size: 'XL',
      condition: 'Excellent - collector stored',
      jerseyType: 'classic-jersey',
      isSigned: 0,
      hasCoa: 1,
      description: 'Centenary white kit with Zidane print. Closed demo auction waiting for payment upload.',
      status: 'verified',
      images: [image('photo-1540747737956-37872404a8c1')]
    },
    {
      id: demoId('jersey-closed-henry'),
      categorySlug: 'signed-jersey',
      sellerId: users.seller2,
      title: 'Arsenal 2003-04 Home - Signed Thierry Henry Invincibles',
      playerName: 'Thierry Henry',
      clubName: 'Arsenal',
      leagueName: 'Premier League',
      season: '2003-2004',
      size: 'L',
      condition: 'Excellent - signed on front panel',
      jerseyType: 'signed-jersey',
      isSigned: 1,
      hasCoa: 1,
      description: 'Signed Invincibles era jersey. Demo transaction is waiting for admin payment verification.',
      status: 'verified',
      images: [image('photo-1579952363873-27f3bade9f55')]
    },
    {
      id: demoId('jersey-closed-kaka'),
      categorySlug: 'match-worn-jersey',
      sellerId: users.seller,
      title: 'AC Milan 2006-07 Home - Kaka #22 Match Worn Style',
      playerName: 'Kaka',
      clubName: 'AC Milan',
      leagueName: 'Serie A / UEFA Champions League',
      season: '2006-2007',
      size: 'M',
      condition: 'Excellent',
      jerseyType: 'match-worn-jersey',
      isSigned: 0,
      hasCoa: 1,
      description: 'Demo paid transaction waiting for seller/admin shipment input.',
      status: 'verified',
      images: [image('photo-1546519638-68e109498ffc')]
    },
    {
      id: demoId('jersey-closed-iniesta'),
      categorySlug: 'match-issued-jersey',
      sellerId: users.seller,
      title: 'Spain 2010 Home - Andres Iniesta Final Tribute Jersey',
      playerName: 'Andres Iniesta',
      clubName: 'Spain National Team',
      leagueName: 'World Cup',
      season: '2010',
      size: 'M',
      condition: 'Very Good',
      jerseyType: 'match-issued-jersey',
      isSigned: 0,
      hasCoa: 1,
      description: 'Demo shipped transaction with tracking number shown in user dashboard.',
      status: 'verified',
      images: [image('photo-1556056504-5c7696c4c28d')]
    },
    {
      id: demoId('jersey-closed-totti'),
      categorySlug: 'classic-jersey',
      sellerId: users.seller2,
      title: 'AS Roma 2000-01 Home - Francesco Totti Scudetto Jersey',
      playerName: 'Francesco Totti',
      clubName: 'AS Roma',
      leagueName: 'Serie A',
      season: '2000-2001',
      size: 'L',
      condition: 'Excellent',
      jerseyType: 'classic-jersey',
      isSigned: 0,
      hasCoa: 0,
      description: 'Demo completed transaction included in revenue stats and CSV export.',
      status: 'verified',
      images: [image('photo-1517466787929-bc90951d0974')]
    },
    {
      id: demoId('jersey-closed-neymar'),
      categorySlug: 'signed-jersey',
      sellerId: users.seller,
      title: 'Brazil 2014 Home - Neymar Jr #10 Signed Display Jersey',
      playerName: 'Neymar Jr',
      clubName: 'Brazil National Team',
      leagueName: 'World Cup',
      season: '2014',
      size: 'M',
      condition: 'Mint',
      jerseyType: 'signed-jersey',
      isSigned: 1,
      hasCoa: 1,
      description: 'Demo rejected payment record so admin can see rejected proof state.',
      status: 'verified',
      images: [image('photo-1431324155629-1a6deb1dec8d')]
    },
    {
      id: demoId('jersey-pending-seller'),
      categorySlug: 'match-worn-jersey',
      sellerId: users.seller,
      title: 'Chelsea 2012 Home - Didier Drogba Munich Final Submission',
      playerName: 'Didier Drogba',
      clubName: 'Chelsea',
      leagueName: 'UEFA Champions League',
      season: '2011-2012',
      size: 'L',
      condition: 'Pending physical inspection',
      jerseyType: 'match-worn-jersey',
      isSigned: 0,
      hasCoa: 0,
      description: 'Pending verification dummy item for admin approval queue.',
      status: 'pending_verification',
      images: [image('photo-1508098682722-e99c43a406b2')]
    },
    {
      id: demoId('jersey-rejected-seller'),
      categorySlug: 'classic-jersey',
      sellerId: users.seller,
      title: 'Liverpool 2005 Home - Rejected Sample Listing',
      playerName: 'Steven Gerrard',
      clubName: 'Liverpool',
      leagueName: 'UEFA Champions League',
      season: '2004-2005',
      size: 'XL',
      condition: 'Needs better evidence photos',
      jerseyType: 'classic-jersey',
      isSigned: 0,
      hasCoa: 0,
      description: 'Rejected dummy item so seller can see rejected state.',
      status: 'rejected',
      images: [image('photo-1522778119026-d647f0596c20')]
    },
    {
      id: demoId('jersey-draft-seller'),
      categorySlug: 'signed-jersey',
      sellerId: users.seller,
      title: 'Inter Milan 1998 Away - Ronaldo Nazario Draft Listing',
      playerName: 'Ronaldo Nazario',
      clubName: 'Inter Milan',
      leagueName: 'Serie A',
      season: '1998-1999',
      size: 'L',
      condition: 'Draft - photos incomplete',
      jerseyType: 'signed-jersey',
      isSigned: 1,
      hasCoa: 0,
      description: 'Draft dummy item for seller status variety.',
      status: 'draft',
      images: [image('photo-1574629810360-7efbbe195018')]
    }
  ];

  const insertJersey = db.prepare(`
    INSERT INTO jerseys (id, category_id, seller_id, title, player_name, club_name, league_name, season, size, condition, jersey_type, is_signed, has_coa, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertImage = db.prepare('INSERT INTO jersey_images (id, jersey_id, image_url, sort_order) VALUES (?, ?, ?, ?)');

  jerseys.forEach(jersey => {
    insertJersey.run(
      jersey.id,
      categoryIds.get(jersey.categorySlug),
      jersey.sellerId,
      jersey.title,
      jersey.playerName,
      jersey.clubName,
      jersey.leagueName,
      jersey.season,
      jersey.size,
      jersey.condition,
      jersey.jerseyType,
      jersey.isSigned,
      jersey.hasCoa,
      jersey.description,
      jersey.status
    );

    jersey.images.forEach((url, index) => {
      insertImage.run(demoId(`image-${jersey.id.replace('demo-', '')}-${index}`), jersey.id, url, index);
    });
  });

  const auctions: DemoAuction[] = [
    { id: demoId('auction-live-cr7'), jerseyId: demoId('jersey-live-cr7'), startPrice: 5000000, currentPrice: 6600000, minIncrement: 100000, startTime: iso(-18 * HOUR), endTime: iso(30 * HOUR), status: 'live' },
    { id: demoId('auction-live-messi'), jerseyId: demoId('jersey-live-messi'), startPrice: 8000000, currentPrice: 10500000, minIncrement: 250000, startTime: iso(-10 * HOUR), endTime: iso(8 * HOUR), status: 'live' },
    { id: demoId('auction-live-beckham'), jerseyId: demoId('jersey-live-beckham'), startPrice: 2500000, currentPrice: 3400000, minIncrement: 100000, startTime: iso(-6 * HOUR), endTime: iso(4 * HOUR), status: 'live' },
    { id: demoId('auction-upcoming-persib'), jerseyId: demoId('jersey-upcoming-persib'), startPrice: 1800000, currentPrice: 1800000, minIncrement: 50000, startTime: iso(16 * HOUR), endTime: iso(3 * DAY), status: 'upcoming' },
    { id: demoId('auction-upcoming-japan'), jerseyId: demoId('jersey-upcoming-japan'), startPrice: 1200000, currentPrice: 1200000, minIncrement: 50000, startTime: iso(2 * DAY), endTime: iso(5 * DAY), status: 'upcoming' },
    { id: demoId('auction-closed-zidane'), jerseyId: demoId('jersey-closed-zidane'), startPrice: 2000000, currentPrice: 2750000, minIncrement: 50000, startTime: iso(-7 * DAY), endTime: iso(-5 * DAY), status: 'closed', winnerUserId: users.member },
    { id: demoId('auction-closed-henry'), jerseyId: demoId('jersey-closed-henry'), startPrice: 3200000, currentPrice: 4100000, minIncrement: 100000, startTime: iso(-6 * DAY), endTime: iso(-4 * DAY), status: 'closed', winnerUserId: users.member },
    { id: demoId('auction-closed-kaka'), jerseyId: demoId('jersey-closed-kaka'), startPrice: 4000000, currentPrice: 5200000, minIncrement: 100000, startTime: iso(-5 * DAY), endTime: iso(-3 * DAY), status: 'closed', winnerUserId: users.member },
    { id: demoId('auction-closed-iniesta'), jerseyId: demoId('jersey-closed-iniesta'), startPrice: 2500000, currentPrice: 3900000, minIncrement: 100000, startTime: iso(-8 * DAY), endTime: iso(-6 * DAY), status: 'closed', winnerUserId: users.member },
    { id: demoId('auction-closed-totti'), jerseyId: demoId('jersey-closed-totti'), startPrice: 2800000, currentPrice: 4750000, minIncrement: 100000, startTime: iso(-10 * DAY), endTime: iso(-8 * DAY), status: 'closed', winnerUserId: users.member },
    { id: demoId('auction-closed-neymar'), jerseyId: demoId('jersey-closed-neymar'), startPrice: 3500000, currentPrice: 4300000, minIncrement: 100000, startTime: iso(-9 * DAY), endTime: iso(-7 * DAY), status: 'closed', winnerUserId: users.member }
  ];

  const insertAuction = db.prepare(`
    INSERT INTO auctions (id, jersey_id, start_price, current_price, min_increment, start_time, end_time, status, winner_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  auctions.forEach(auction => {
    insertAuction.run(
      auction.id,
      auction.jerseyId,
      auction.startPrice,
      auction.currentPrice,
      auction.minIncrement,
      auction.startTime,
      auction.endTime,
      auction.status,
      auction.winnerUserId || null
    );
  });

  const bids: DemoBid[] = [
    { id: demoId('bid-cr7-1'), auctionId: demoId('auction-live-cr7'), userId: users.buyer2, amount: 5500000, createdAt: iso(-16 * HOUR) },
    { id: demoId('bid-cr7-2'), auctionId: demoId('auction-live-cr7'), userId: users.member, amount: 6100000, createdAt: iso(-12 * HOUR) },
    { id: demoId('bid-cr7-3'), auctionId: demoId('auction-live-cr7'), userId: users.buyer3, amount: 6600000, createdAt: iso(-2 * HOUR) },
    { id: demoId('bid-messi-1'), auctionId: demoId('auction-live-messi'), userId: users.member, amount: 8750000, createdAt: iso(-8 * HOUR) },
    { id: demoId('bid-messi-2'), auctionId: demoId('auction-live-messi'), userId: users.buyer2, amount: 9500000, createdAt: iso(-4 * HOUR) },
    { id: demoId('bid-messi-3'), auctionId: demoId('auction-live-messi'), userId: users.buyer3, amount: 10500000, createdAt: iso(-1 * HOUR) },
    { id: demoId('bid-beckham-1'), auctionId: demoId('auction-live-beckham'), userId: users.member, amount: 2800000, createdAt: iso(-5 * HOUR) },
    { id: demoId('bid-beckham-2'), auctionId: demoId('auction-live-beckham'), userId: users.buyer2, amount: 3400000, createdAt: iso(-90 * 60 * 1000) },
    { id: demoId('bid-zidane-1'), auctionId: demoId('auction-closed-zidane'), userId: users.buyer2, amount: 2300000, createdAt: iso(-6 * DAY) },
    { id: demoId('bid-zidane-2'), auctionId: demoId('auction-closed-zidane'), userId: users.member, amount: 2750000, createdAt: iso(-5 * DAY - HOUR) },
    { id: demoId('bid-henry-1'), auctionId: demoId('auction-closed-henry'), userId: users.buyer3, amount: 3600000, createdAt: iso(-5 * DAY) },
    { id: demoId('bid-henry-2'), auctionId: demoId('auction-closed-henry'), userId: users.member, amount: 4100000, createdAt: iso(-4 * DAY - HOUR) },
    { id: demoId('bid-kaka-1'), auctionId: demoId('auction-closed-kaka'), userId: users.buyer2, amount: 4550000, createdAt: iso(-4 * DAY) },
    { id: demoId('bid-kaka-2'), auctionId: demoId('auction-closed-kaka'), userId: users.member, amount: 5200000, createdAt: iso(-3 * DAY - HOUR) },
    { id: demoId('bid-iniesta-1'), auctionId: demoId('auction-closed-iniesta'), userId: users.buyer3, amount: 3200000, createdAt: iso(-7 * DAY) },
    { id: demoId('bid-iniesta-2'), auctionId: demoId('auction-closed-iniesta'), userId: users.member, amount: 3900000, createdAt: iso(-6 * DAY - HOUR) },
    { id: demoId('bid-totti-1'), auctionId: demoId('auction-closed-totti'), userId: users.buyer2, amount: 3600000, createdAt: iso(-9 * DAY) },
    { id: demoId('bid-totti-2'), auctionId: demoId('auction-closed-totti'), userId: users.member, amount: 4750000, createdAt: iso(-8 * DAY - HOUR) },
    { id: demoId('bid-neymar-1'), auctionId: demoId('auction-closed-neymar'), userId: users.buyer2, amount: 3900000, createdAt: iso(-8 * DAY) },
    { id: demoId('bid-neymar-2'), auctionId: demoId('auction-closed-neymar'), userId: users.member, amount: 4300000, createdAt: iso(-7 * DAY - HOUR) }
  ];

  const insertBid = db.prepare('INSERT INTO bids (id, auction_id, user_id, bid_amount, created_at) VALUES (?, ?, ?, ?, ?)');
  bids.forEach(bid => insertBid.run(bid.id, bid.auctionId, bid.userId, bid.amount, bid.createdAt));

  const winners: DemoWinner[] = [
    { id: demoId('winner-waiting-payment'), auctionId: demoId('auction-closed-zidane'), userId: users.member, finalPrice: 2750000, status: 'waiting_payment', paymentDeadline: iso(18 * HOUR) },
    { id: demoId('winner-waiting-verification'), auctionId: demoId('auction-closed-henry'), userId: users.member, finalPrice: 4100000, status: 'waiting_verification', paymentDeadline: iso(-2 * DAY) },
    { id: demoId('winner-paid'), auctionId: demoId('auction-closed-kaka'), userId: users.member, finalPrice: 5200000, status: 'paid', paymentDeadline: iso(-2 * DAY) },
    { id: demoId('winner-shipped'), auctionId: demoId('auction-closed-iniesta'), userId: users.member, finalPrice: 3900000, status: 'shipped', paymentDeadline: iso(-5 * DAY) },
    { id: demoId('winner-completed'), auctionId: demoId('auction-closed-totti'), userId: users.member, finalPrice: 4750000, status: 'completed', paymentDeadline: iso(-7 * DAY) },
    { id: demoId('winner-rejected-payment'), auctionId: demoId('auction-closed-neymar'), userId: users.member, finalPrice: 4300000, status: 'waiting_payment', paymentDeadline: iso(22 * HOUR) }
  ];

  const insertWinner = db.prepare(`
    INSERT INTO auction_winners (id, auction_id, user_id, final_price, status, payment_deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  winners.forEach(winner => insertWinner.run(winner.id, winner.auctionId, winner.userId, winner.finalPrice, winner.status, winner.paymentDeadline));

  const payments = [
    { id: demoId('payment-pending'), winnerId: demoId('winner-waiting-verification'), userId: users.member, amount: 4100000, proof: demoProofUrl, status: 'pending_verification', paidAt: iso(-36 * HOUR) },
    { id: demoId('payment-verified-paid'), winnerId: demoId('winner-paid'), userId: users.member, amount: 5200000, proof: demoProofUrl, status: 'verified', paidAt: iso(-48 * HOUR) },
    { id: demoId('payment-verified-shipped'), winnerId: demoId('winner-shipped'), userId: users.member, amount: 3900000, proof: demoProofUrl, status: 'verified', paidAt: iso(-5 * DAY) },
    { id: demoId('payment-verified-completed'), winnerId: demoId('winner-completed'), userId: users.member, amount: 4750000, proof: demoProofUrl, status: 'verified', paidAt: iso(-7 * DAY) },
    { id: demoId('payment-rejected'), winnerId: demoId('winner-rejected-payment'), userId: users.member, amount: 4300000, proof: demoProofUrl, status: 'rejected', paidAt: iso(-24 * HOUR) }
  ];

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, winner_id, user_id, amount, proof_image_url, status, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  payments.forEach(payment => insertPayment.run(payment.id, payment.winnerId, payment.userId, payment.amount, payment.proof, payment.status, payment.paidAt));

  const shipments = [
    { id: demoId('shipment-pending-verification'), winnerId: demoId('winner-waiting-verification'), recipient: 'Andi Member', address: 'Jl. Sudirman No. 10, Jakarta Pusat', courier: 'JNE Reguler', tracking: null, status: 'pending' },
    { id: demoId('shipment-pending-paid'), winnerId: demoId('winner-paid'), recipient: 'Andi Member', address: 'Jl. Tebet Raya No. 88, Jakarta Selatan', courier: 'J&T Express', tracking: null, status: 'pending' },
    { id: demoId('shipment-shipped'), winnerId: demoId('winner-shipped'), recipient: 'Andi Member', address: 'Jl. Diponegoro No. 21, Bandung', courier: 'Sicepat Reguler', tracking: 'SI-LELANG-20260608', status: 'shipped' },
    { id: demoId('shipment-completed'), winnerId: demoId('winner-completed'), recipient: 'Andi Member', address: 'Jl. Pemuda No. 5, Surabaya', courier: 'JNE YES', tracking: 'JNE-DELIVERED-20260601', status: 'delivered' }
  ];

  const insertShipment = db.prepare(`
    INSERT INTO shipments (id, winner_id, recipient_name, address, courier, tracking_number, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  shipments.forEach(shipment => insertShipment.run(shipment.id, shipment.winnerId, shipment.recipient, shipment.address, shipment.courier, shipment.tracking, shipment.status));

  const certificates = [
    { id: demoId('cert-cr7'), jerseyId: demoId('jersey-live-cr7'), coa: 'COA-DEMO-CR7-MU0708', verifier: 'LelangBID Verification Team', status: 'valid' },
    { id: demoId('cert-messi'), jerseyId: demoId('jersey-live-messi'), coa: 'COA-DEMO-MESSI-BAR1415', verifier: 'LelangBID Verification Team', status: 'valid' },
    { id: demoId('cert-persib'), jerseyId: demoId('jersey-upcoming-persib'), coa: 'COA-DEMO-PERSIB-2023', verifier: 'Indonesian Kit Authenticator', status: 'valid' },
    { id: demoId('cert-zidane'), jerseyId: demoId('jersey-closed-zidane'), coa: 'COA-DEMO-ZIDANE-RM02', verifier: 'LelangBID Verification Team', status: 'valid' },
    { id: demoId('cert-henry'), jerseyId: demoId('jersey-closed-henry'), coa: 'COA-DEMO-HENRY-ARS0404', verifier: 'Premier Shirt Archive', status: 'valid' },
    { id: demoId('cert-kaka'), jerseyId: demoId('jersey-closed-kaka'), coa: 'COA-DEMO-KAKA-MILAN0707', verifier: 'LelangBID Verification Team', status: 'valid' },
    { id: demoId('cert-iniesta'), jerseyId: demoId('jersey-closed-iniesta'), coa: 'COA-DEMO-INIESTA-ESP10', verifier: 'World Kit Archive', status: 'valid' },
    { id: demoId('cert-neymar-revoked'), jerseyId: demoId('jersey-closed-neymar'), coa: 'COA-DEMO-NEYMAR-REVOKED', verifier: 'LelangBID Verification Team', status: 'revoked' }
  ];

  const insertCertificate = db.prepare(`
    INSERT INTO certificates (id, jersey_id, coa_number, qr_code_url, verifier_name, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  certificates.forEach(cert => insertCertificate.run(cert.id, cert.jerseyId, cert.coa, `/verify/${cert.coa}`, cert.verifier, cert.status));

  const notifications = [
    { userId: users.member, title: 'You won the Zidane auction', message: 'Upload payment proof for Real Madrid 2002 Centenary - Zinedine Zidane #5 before the deadline.', type: 'winner' },
    { userId: users.member, title: 'Payment waiting for verification', message: 'Your Henry Invincibles receipt is waiting for admin review.', type: 'payment' },
    { userId: users.member, title: 'Shipment needs processing', message: 'Your Kaka AC Milan jersey is paid and waiting for tracking number input.', type: 'shipment' },
    { userId: users.member, title: 'Your jersey has been shipped', message: 'Spain 2010 Iniesta jersey was shipped via Sicepat Reguler. Tracking: SI-LELANG-20260608.', type: 'shipment' },
    { userId: users.member, title: 'Payment proof rejected', message: 'Your Neymar receipt was rejected. Please upload a clearer transfer proof.', type: 'rejected' },
    { userId: users.seller, title: 'Jersey waiting for admin review', message: 'Chelsea 2012 Drogba submission is visible in the admin verification queue.', type: 'jersey_verify' },
    { userId: users.seller, title: 'Demo seller data ready', message: 'Your Seller Center now shows verified, pending, rejected, and draft listing states.', type: 'seller' },
    { userId: users.admin, title: 'Demo data refreshed', message: 'Admin panel now has users, auctions, payments, shipments, COA records, and revenue demo data.', type: 'admin' }
  ];

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  notifications.forEach((notification, index) => {
    insertNotification.run(demoId(`notification-${index + 1}`), notification.userId, notification.title, notification.message, notification.type, 0);
  });

  console.log('Demo data seeded successfully.');
  console.log('Login demo accounts:');
  console.log('- admin@lelangbid.com / admin123');
  console.log('- seller@lelangbid.com / seller123');
  console.log('- member@lelangbid.com / member123');
  console.log('- buyer@lelangbid.com / member123');
}

seedDemo();
