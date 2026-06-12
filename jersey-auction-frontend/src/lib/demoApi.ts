import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getBidIncrementForAmount, getNextMinimumBid } from './bidIncrement';

type Role = 'member' | 'seller' | 'admin';
type UserStatus = 'active' | 'suspended';

type User = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  status: UserStatus;
  deposit_balance: number;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type Jersey = {
  id: string;
  category_id: string;
  seller_id: string;
  title: string;
  player_name: string;
  club_name: string;
  league_name: string;
  season: string;
  size: string;
  condition: string;
  jersey_type: string;
  is_signed: number;
  has_coa: number;
  description: string;
  auction_start_time?: string | null;
  auction_end_time?: string | null;
  auction_start_price?: number | null;
  reserve_price?: number | null;
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected';
  created_at: string;
};

type JerseyImage = {
  id: string;
  jersey_id: string;
  image_url: string;
  sort_order: number;
};

type Auction = {
  id: string;
  jersey_id: string;
  start_price: number;
  current_price: number;
  min_increment: number;
  reserve_price?: number | null;
  start_time: string;
  end_time: string;
  status: 'live' | 'upcoming' | 'closed' | 'negotiation' | 'failed';
  winner_user_id: string | null;
  created_at: string;
};

type Bid = {
  id: string;
  auction_id: string;
  user_id: string;
  bid_amount: number;
  created_at: string;
};

type Winner = {
  id: string;
  auction_id: string;
  user_id: string;
  final_price: number;
  status: 'waiting_payment' | 'waiting_verification' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  payment_deadline: string;
  created_at: string;
};

type Payment = {
  id: string;
  winner_id: string;
  user_id: string;
  amount: number;
  proof_image_url: string;
  status: 'waiting_upload' | 'pending_verification' | 'verified' | 'rejected';
  paid_at: string | null;
  created_at: string;
};

type Shipment = {
  id: string;
  winner_id: string;
  recipient_name: string;
  address: string;
  courier: string;
  tracking_number: string | null;
  status: 'pending' | 'shipped' | 'delivered';
  created_at: string;
};

type Certificate = {
  id: string;
  jersey_id: string;
  coa_number: string;
  qr_code_url: string;
  verifier_name: string;
  status: 'valid' | 'revoked' | 'pending';
  created_at: string;
};

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
};

type DepositTransaction = {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending_verification' | 'verified' | 'rejected';
  method: string;
  proof_image_url?: string | null;
  admin_note?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
};

type DepositBankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  instructions: string;
  updated_at: string;
};

type SellerApplication = {
  id: string;
  user_id: string;
  store_name?: string | null;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

type DemoState = {
  users: User[];
  categories: Category[];
  jerseys: Jersey[];
  jerseyImages: JerseyImage[];
  auctions: Auction[];
  bids: Bid[];
  winners: Winner[];
  payments: Payment[];
  shipments: Shipment[];
  certificates: Certificate[];
  notifications: Notification[];
  deposits: DepositTransaction[];
  depositBankAccount: DepositBankAccount | null;
  sellerApplications: SellerApplication[];
};

const STORAGE_KEY = 'lelangbid_demo_state_v1';
const BID_DEPOSIT_REQUIRED = 1000000;
const DEPOSIT_REFUND_RATE = 0.7;
const DEPOSIT_FORFEIT_RATE = 0.3;
const DEPOSIT_REQUEST_MINIMUM = 50000;
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;
const iso = (offset: number) => new Date(now + offset).toISOString();
const demoProofUrl = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=900&auto=format&fit=crop';
const image = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1000&auto=format&fit=crop`;

const ids = {
  admin: 'demo-user-admin',
  seller: 'demo-user-seller',
  seller2: 'demo-user-seller-2',
  member: 'demo-user-member',
  buyer: 'demo-user-buyer',
  collector: 'demo-user-collector'
};

const nextId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const initialState = (): DemoState => {
  const createdAt = iso(-10 * day);
  const categories: Category[] = [
    { id: 'cat-classic', name: 'Classic Jersey', slug: 'classic-jersey', created_at: createdAt },
    { id: 'cat-signed', name: 'Signed Jersey', slug: 'signed-jersey', created_at: createdAt },
    { id: 'cat-match-worn', name: 'Match Worn Jersey', slug: 'match-worn-jersey', created_at: createdAt },
    { id: 'cat-match-issued', name: 'Match Issued Jersey', slug: 'match-issued-jersey', created_at: createdAt },
    { id: 'cat-national', name: 'National Team Jersey', slug: 'national-team-jersey', created_at: createdAt }
  ];

  const users: User[] = [
    { id: ids.admin, full_name: 'Super Admin LelangBID', email: 'admin@lelangbid.com', phone: '081234567890', password: 'admin123', role: 'admin', status: 'active', deposit_balance: 0, created_at: createdAt },
    { id: ids.seller, full_name: 'Jersey Collector Seller', email: 'seller@lelangbid.com', phone: '081234567891', password: 'seller123', role: 'seller', status: 'active', deposit_balance: 0, created_at: createdAt },
    { id: ids.seller2, full_name: 'Vintage Kit Room', email: 'seller2@lelangbid.com', phone: '081299887766', password: 'seller123', role: 'seller', status: 'active', deposit_balance: 0, created_at: createdAt },
    { id: ids.member, full_name: 'Andi Member', email: 'member@lelangbid.com', phone: '081234567892', password: 'member123', role: 'member', status: 'active', deposit_balance: 2000000, created_at: createdAt },
    { id: ids.buyer, full_name: 'Raka Bid Hunter', email: 'buyer@lelangbid.com', phone: '081355557777', password: 'member123', role: 'member', status: 'active', deposit_balance: 0, created_at: createdAt },
    { id: ids.collector, full_name: 'Dimas Kit Collector', email: 'collector@lelangbid.com', phone: '081366668888', password: 'member123', role: 'member', status: 'active', deposit_balance: 1500000, created_at: createdAt },
    { id: 'demo-user-suspended', full_name: 'Suspended Demo User', email: 'suspended@lelangbid.com', phone: '081377779999', password: 'member123', role: 'member', status: 'suspended', deposit_balance: 0, created_at: createdAt }
  ];

  const jersey = (id: string, category_id: string, seller_id: string, title: string, player_name: string, club_name: string, league_name: string, season: string, size: string, condition: string, jersey_type: string, is_signed: number, has_coa: number, status: Jersey['status'], description: string): Jersey => ({
    id,
    category_id,
    seller_id,
    title,
    player_name,
    club_name,
    league_name,
    season,
    size,
    condition,
    jersey_type,
    is_signed,
    has_coa,
    description,
    auction_start_time: iso(12 * hour),
    auction_end_time: iso(3 * day),
    auction_start_price: 1000000,
    reserve_price: 1500000,
    status,
    created_at: iso(-8 * day)
  });

  const jerseys: Jersey[] = [
    jersey('jersey-cr7', 'cat-match-worn', ids.seller, 'Manchester United 2007-08 Home - Match Worn Cristiano Ronaldo #7', 'Cristiano Ronaldo', 'Manchester United', 'Premier League / UEFA Champions League', '2007-2008', 'L', 'Match Worn - Excellent with pitch marks', 'match-worn-jersey', 1, 1, 'verified', 'Premium match worn collectible from a legendary double-winning season. Includes signature placement inspection, fabric wear notes, and LelangBID COA.'),
    jersey('jersey-messi', 'cat-signed', ids.seller, 'Barcelona 2014-15 Home - Signed Lionel Messi Treble Season', 'Lionel Messi', 'FC Barcelona', 'La Liga / UEFA Champions League', '2014-2015', 'M', 'Mint - Display framed condition', 'signed-jersey', 1, 1, 'verified', 'Signed Barcelona home shirt from the treble era. Perfect display piece with hologram verification record.'),
    jersey('jersey-beckham', 'cat-classic', ids.seller2, 'England 2001 Home - David Beckham #7 Classic Qualifier Jersey', 'David Beckham', 'England National Team', 'World Cup Qualifier', '2001', 'XL', 'Very Good - minor age marks', 'classic-jersey', 0, 0, 'verified', 'Classic England home jersey inspired by the 2001 qualifier era.'),
    jersey('jersey-persib', 'cat-match-issued', ids.seller2, 'Persib Bandung 2023 Away - Match Issued Marc Klok #23', 'Marc Klok', 'Persib Bandung', 'Liga 1 Indonesia', '2023-2024', 'L', 'Match Issued - unused', 'match-issued-jersey', 0, 1, 'verified', 'Indonesia league match issued shirt with internal tagging and verification notes.'),
    jersey('jersey-japan', 'cat-national', ids.seller, 'Japan 2022 Home - National Team Blue Samurai Collector Jersey', 'Kaoru Mitoma', 'Japan National Team', 'World Cup', '2022', 'M', 'Mint', 'classic-jersey', 0, 0, 'verified', 'National team collector jersey with excellent fabric and badge condition.'),
    jersey('jersey-zidane', 'cat-classic', ids.seller, 'Real Madrid 2002 Centenary - Zinedine Zidane #5', 'Zinedine Zidane', 'Real Madrid', 'La Liga', '2002-2003', 'XL', 'Excellent - collector stored', 'classic-jersey', 0, 1, 'verified', 'Centenary white kit with Zidane print. Closed demo auction waiting for payment upload.'),
    jersey('jersey-henry', 'cat-signed', ids.seller2, 'Arsenal 2003-04 Home - Signed Thierry Henry Invincibles', 'Thierry Henry', 'Arsenal', 'Premier League', '2003-2004', 'L', 'Excellent - signed on front panel', 'signed-jersey', 1, 1, 'verified', 'Signed Invincibles era jersey. Demo transaction is waiting for admin payment verification.'),
    jersey('jersey-kaka', 'cat-match-worn', ids.seller, 'AC Milan 2006-07 Home - Kaka #22 Match Worn Style', 'Kaka', 'AC Milan', 'Serie A / UEFA Champions League', '2006-2007', 'M', 'Excellent', 'match-worn-jersey', 0, 1, 'verified', 'Demo paid transaction waiting for seller/admin shipment input.'),
    jersey('jersey-iniesta', 'cat-match-issued', ids.seller, 'Spain 2010 Home - Andres Iniesta Final Tribute Jersey', 'Andres Iniesta', 'Spain National Team', 'World Cup', '2010', 'M', 'Very Good', 'match-issued-jersey', 0, 1, 'verified', 'Demo shipped transaction with tracking number shown in user dashboard.'),
    jersey('jersey-totti', 'cat-classic', ids.seller2, 'AS Roma 2000-01 Home - Francesco Totti Scudetto Jersey', 'Francesco Totti', 'AS Roma', 'Serie A', '2000-2001', 'L', 'Excellent', 'classic-jersey', 0, 0, 'verified', 'Demo completed transaction included in revenue stats.'),
    jersey('jersey-neymar', 'cat-signed', ids.seller, 'Brazil 2014 Home - Neymar Jr #10 Signed Display Jersey', 'Neymar Jr', 'Brazil National Team', 'World Cup', '2014', 'M', 'Mint', 'signed-jersey', 1, 1, 'verified', 'Demo rejected payment record so admin can see rejected proof state.'),
    jersey('jersey-pending', 'cat-match-worn', ids.seller, 'Chelsea 2012 Home - Didier Drogba Munich Final Submission', 'Didier Drogba', 'Chelsea', 'UEFA Champions League', '2011-2012', 'L', 'Pending physical inspection', 'match-worn-jersey', 0, 0, 'pending_verification', 'Pending verification dummy item for admin approval queue.'),
    jersey('jersey-rejected', 'cat-classic', ids.seller, 'Liverpool 2005 Home - Rejected Sample Listing', 'Steven Gerrard', 'Liverpool', 'UEFA Champions League', '2004-2005', 'XL', 'Needs better evidence photos', 'classic-jersey', 0, 0, 'rejected', 'Rejected dummy item so seller can see rejected state.'),
    jersey('jersey-draft', 'cat-signed', ids.seller, 'Inter Milan 1998 Away - Ronaldo Nazario Draft Listing', 'Ronaldo Nazario', 'Inter Milan', 'Serie A', '1998-1999', 'L', 'Draft - photos incomplete', 'signed-jersey', 1, 0, 'draft', 'Draft dummy item for seller status variety.')
  ];

  const jerseyImages: JerseyImage[] = [
    ['jersey-cr7', image('photo-1508098682722-e99c43a406b2'), image('photo-1517649763962-0c623066013b')],
    ['jersey-messi', image('photo-1522778119026-d647f0596c20'), image('photo-1579952363873-27f3bade9f55')],
    ['jersey-beckham', image('photo-1574629810360-7efbbe195018')],
    ['jersey-persib', image('photo-1518091043644-c1d4457512c6')],
    ['jersey-japan', image('photo-1551958219-acbc608c6377')],
    ['jersey-zidane', image('photo-1540747737956-37872404a8c1')],
    ['jersey-henry', image('photo-1579952363873-27f3bade9f55')],
    ['jersey-kaka', image('photo-1546519638-68e109498ffc')],
    ['jersey-iniesta', image('photo-1556056504-5c7696c4c28d')],
    ['jersey-totti', image('photo-1517466787929-bc90951d0974')],
    ['jersey-neymar', image('photo-1431324155629-1a6deb1dec8d')],
    ['jersey-pending', image('photo-1508098682722-e99c43a406b2')],
    ['jersey-rejected', image('photo-1522778119026-d647f0596c20')],
    ['jersey-draft', image('photo-1574629810360-7efbbe195018')]
  ].flatMap(([jersey_id, ...urls]) => urls.map((image_url, sort_order) => ({
    id: `${jersey_id}-image-${sort_order}`,
    jersey_id,
    image_url,
    sort_order
  })));

  const auction = (id: string, jersey_id: string, start_price: number, current_price: number, min_increment: number, start_time: string, end_time: string, status: Auction['status'], winner_user_id: string | null = null): Auction => ({
    id,
    jersey_id,
    start_price,
    current_price,
    min_increment,
    reserve_price: Math.max(start_price, current_price),
    start_time,
    end_time,
    status,
    winner_user_id,
    created_at: iso(-7 * day)
  });

  const auctions: Auction[] = [
    auction('auction-cr7', 'jersey-cr7', 5000000, 6600000, 100000, iso(-18 * hour), iso(30 * hour), 'live'),
    auction('auction-messi', 'jersey-messi', 8000000, 10500000, 250000, iso(-10 * hour), iso(8 * hour), 'live'),
    auction('auction-beckham', 'jersey-beckham', 2500000, 3400000, 100000, iso(-6 * hour), iso(4 * hour), 'live'),
    auction('auction-persib', 'jersey-persib', 1800000, 1800000, 50000, iso(16 * hour), iso(3 * day), 'upcoming'),
    auction('auction-japan', 'jersey-japan', 1200000, 1200000, 50000, iso(2 * day), iso(5 * day), 'upcoming'),
    auction('auction-zidane', 'jersey-zidane', 2000000, 2750000, 50000, iso(-7 * day), iso(-5 * day), 'closed', ids.member),
    auction('auction-henry', 'jersey-henry', 3200000, 4100000, 100000, iso(-6 * day), iso(-4 * day), 'closed', ids.member),
    auction('auction-kaka', 'jersey-kaka', 4000000, 5200000, 100000, iso(-5 * day), iso(-3 * day), 'closed', ids.member),
    auction('auction-iniesta', 'jersey-iniesta', 2500000, 3900000, 100000, iso(-8 * day), iso(-6 * day), 'closed', ids.member),
    auction('auction-totti', 'jersey-totti', 2800000, 4750000, 100000, iso(-10 * day), iso(-8 * day), 'closed', ids.member),
    auction('auction-neymar', 'jersey-neymar', 3500000, 4300000, 100000, iso(-9 * day), iso(-7 * day), 'closed', ids.member)
  ];

  const bid = (id: string, auction_id: string, user_id: string, bid_amount: number, created_at: string): Bid => ({ id, auction_id, user_id, bid_amount, created_at });
  const bids: Bid[] = [
    bid('bid-cr7-1', 'auction-cr7', ids.buyer, 5500000, iso(-16 * hour)),
    bid('bid-cr7-2', 'auction-cr7', ids.member, 6100000, iso(-12 * hour)),
    bid('bid-cr7-3', 'auction-cr7', ids.collector, 6600000, iso(-2 * hour)),
    bid('bid-messi-1', 'auction-messi', ids.member, 8750000, iso(-8 * hour)),
    bid('bid-messi-2', 'auction-messi', ids.buyer, 9500000, iso(-4 * hour)),
    bid('bid-messi-3', 'auction-messi', ids.collector, 10500000, iso(-1 * hour)),
    bid('bid-beckham-1', 'auction-beckham', ids.member, 2800000, iso(-5 * hour)),
    bid('bid-beckham-2', 'auction-beckham', ids.buyer, 3400000, iso(-90 * 60 * 1000)),
    bid('bid-zidane-1', 'auction-zidane', ids.buyer, 2300000, iso(-6 * day)),
    bid('bid-zidane-2', 'auction-zidane', ids.member, 2750000, iso(-5 * day - hour)),
    bid('bid-henry-1', 'auction-henry', ids.collector, 3600000, iso(-5 * day)),
    bid('bid-henry-2', 'auction-henry', ids.member, 4100000, iso(-4 * day - hour)),
    bid('bid-kaka-1', 'auction-kaka', ids.buyer, 4550000, iso(-4 * day)),
    bid('bid-kaka-2', 'auction-kaka', ids.member, 5200000, iso(-3 * day - hour)),
    bid('bid-iniesta-1', 'auction-iniesta', ids.collector, 3200000, iso(-7 * day)),
    bid('bid-iniesta-2', 'auction-iniesta', ids.member, 3900000, iso(-6 * day - hour)),
    bid('bid-totti-1', 'auction-totti', ids.buyer, 3600000, iso(-9 * day)),
    bid('bid-totti-2', 'auction-totti', ids.member, 4750000, iso(-8 * day - hour)),
    bid('bid-neymar-1', 'auction-neymar', ids.buyer, 3900000, iso(-8 * day)),
    bid('bid-neymar-2', 'auction-neymar', ids.member, 4300000, iso(-7 * day - hour))
  ];

  const winner = (id: string, auction_id: string, final_price: number, status: Winner['status'], payment_deadline: string): Winner => ({
    id,
    auction_id,
    user_id: ids.member,
    final_price,
    status,
    payment_deadline,
    created_at: iso(-3 * day)
  });

  const winners: Winner[] = [
    winner('winner-zidane', 'auction-zidane', 2750000, 'waiting_payment', iso(18 * hour)),
    winner('winner-henry', 'auction-henry', 4100000, 'waiting_verification', iso(-2 * day)),
    winner('winner-kaka', 'auction-kaka', 5200000, 'paid', iso(-2 * day)),
    winner('winner-iniesta', 'auction-iniesta', 3900000, 'shipped', iso(-5 * day)),
    winner('winner-totti', 'auction-totti', 4750000, 'completed', iso(-7 * day)),
    winner('winner-neymar', 'auction-neymar', 4300000, 'waiting_payment', iso(22 * hour))
  ];

  const payments: Payment[] = [
    { id: 'payment-henry', winner_id: 'winner-henry', user_id: ids.member, amount: 4100000, proof_image_url: demoProofUrl, status: 'pending_verification', paid_at: iso(-36 * hour), created_at: iso(-36 * hour) },
    { id: 'payment-kaka', winner_id: 'winner-kaka', user_id: ids.member, amount: 5200000, proof_image_url: demoProofUrl, status: 'verified', paid_at: iso(-48 * hour), created_at: iso(-48 * hour) },
    { id: 'payment-iniesta', winner_id: 'winner-iniesta', user_id: ids.member, amount: 3900000, proof_image_url: demoProofUrl, status: 'verified', paid_at: iso(-5 * day), created_at: iso(-5 * day) },
    { id: 'payment-totti', winner_id: 'winner-totti', user_id: ids.member, amount: 4750000, proof_image_url: demoProofUrl, status: 'verified', paid_at: iso(-7 * day), created_at: iso(-7 * day) },
    { id: 'payment-neymar', winner_id: 'winner-neymar', user_id: ids.member, amount: 4300000, proof_image_url: demoProofUrl, status: 'rejected', paid_at: iso(-24 * hour), created_at: iso(-24 * hour) }
  ];

  const shipments: Shipment[] = [
    { id: 'shipment-henry', winner_id: 'winner-henry', recipient_name: 'Andi Member', address: 'Jl. Sudirman No. 10, Jakarta Pusat', courier: 'JNE Reguler', tracking_number: null, status: 'pending', created_at: iso(-36 * hour) },
    { id: 'shipment-kaka', winner_id: 'winner-kaka', recipient_name: 'Andi Member', address: 'Jl. Tebet Raya No. 88, Jakarta Selatan', courier: 'J&T Express', tracking_number: null, status: 'pending', created_at: iso(-2 * day) },
    { id: 'shipment-iniesta', winner_id: 'winner-iniesta', recipient_name: 'Andi Member', address: 'Jl. Diponegoro No. 21, Bandung', courier: 'Sicepat Reguler', tracking_number: 'SI-LELANG-20260608', status: 'shipped', created_at: iso(-5 * day) },
    { id: 'shipment-totti', winner_id: 'winner-totti', recipient_name: 'Andi Member', address: 'Jl. Pemuda No. 5, Surabaya', courier: 'JNE YES', tracking_number: 'JNE-DELIVERED-20260601', status: 'delivered', created_at: iso(-7 * day) }
  ];

  const certificates: Certificate[] = [
    { id: 'cert-cr7', jersey_id: 'jersey-cr7', coa_number: 'COA-DEMO-CR7-MU0708', qr_code_url: '/verify/COA-DEMO-CR7-MU0708', verifier_name: 'LelangBID Verification Team', status: 'valid', created_at: iso(-7 * day) },
    { id: 'cert-messi', jersey_id: 'jersey-messi', coa_number: 'COA-DEMO-MESSI-BAR1415', qr_code_url: '/verify/COA-DEMO-MESSI-BAR1415', verifier_name: 'LelangBID Verification Team', status: 'valid', created_at: iso(-7 * day) },
    { id: 'cert-persib', jersey_id: 'jersey-persib', coa_number: 'COA-DEMO-PERSIB-2023', qr_code_url: '/verify/COA-DEMO-PERSIB-2023', verifier_name: 'Indonesian Kit Authenticator', status: 'valid', created_at: iso(-6 * day) },
    { id: 'cert-zidane', jersey_id: 'jersey-zidane', coa_number: 'COA-DEMO-ZIDANE-RM02', qr_code_url: '/verify/COA-DEMO-ZIDANE-RM02', verifier_name: 'LelangBID Verification Team', status: 'valid', created_at: iso(-6 * day) },
    { id: 'cert-henry', jersey_id: 'jersey-henry', coa_number: 'COA-DEMO-HENRY-ARS0404', qr_code_url: '/verify/COA-DEMO-HENRY-ARS0404', verifier_name: 'Premier Shirt Archive', status: 'valid', created_at: iso(-6 * day) },
    { id: 'cert-kaka', jersey_id: 'jersey-kaka', coa_number: 'COA-DEMO-KAKA-MILAN0707', qr_code_url: '/verify/COA-DEMO-KAKA-MILAN0707', verifier_name: 'LelangBID Verification Team', status: 'valid', created_at: iso(-5 * day) },
    { id: 'cert-iniesta', jersey_id: 'jersey-iniesta', coa_number: 'COA-DEMO-INIESTA-ESP10', qr_code_url: '/verify/COA-DEMO-INIESTA-ESP10', verifier_name: 'World Kit Archive', status: 'valid', created_at: iso(-5 * day) },
    { id: 'cert-neymar-revoked', jersey_id: 'jersey-neymar', coa_number: 'COA-DEMO-NEYMAR-REVOKED', qr_code_url: '/verify/COA-DEMO-NEYMAR-REVOKED', verifier_name: 'LelangBID Verification Team', status: 'revoked', created_at: iso(-4 * day) }
  ];

  const notifications: Notification[] = [
    { id: 'notif-1', user_id: ids.member, title: 'You won the Zidane auction', message: 'Upload payment proof for Real Madrid 2002 Centenary before the deadline.', type: 'winner', is_read: 0, created_at: iso(-1 * day) },
    { id: 'notif-2', user_id: ids.member, title: 'Payment waiting for verification', message: 'Your Henry Invincibles receipt is waiting for admin review.', type: 'payment', is_read: 0, created_at: iso(-18 * hour) },
    { id: 'notif-3', user_id: ids.member, title: 'Shipment needs processing', message: 'Your Kaka AC Milan jersey is paid and waiting for tracking number input.', type: 'shipment', is_read: 0, created_at: iso(-8 * hour) },
    { id: 'notif-4', user_id: ids.member, title: 'Your jersey has been shipped', message: 'Spain 2010 Iniesta jersey was shipped via Sicepat Reguler. Tracking: SI-LELANG-20260608.', type: 'shipment', is_read: 0, created_at: iso(-5 * hour) },
    { id: 'notif-5', user_id: ids.member, title: 'Payment proof rejected', message: 'Your Neymar receipt was rejected. Please upload a clearer transfer proof.', type: 'rejected', is_read: 0, created_at: iso(-4 * hour) },
    { id: 'notif-6', user_id: ids.seller, title: 'Jersey waiting for admin review', message: 'Chelsea 2012 Drogba submission is visible in the admin verification queue.', type: 'jersey_verify', is_read: 0, created_at: iso(-12 * hour) },
    { id: 'notif-7', user_id: ids.admin, title: 'Demo data ready', message: 'Admin panel has users, auctions, payments, shipments, COA records, and revenue demo data.', type: 'admin', is_read: 0, created_at: iso(-10 * hour) }
  ];

  const deposits: DepositTransaction[] = [
    { id: 'deposit-member-seed', user_id: ids.member, amount: 2000000, status: 'verified', method: 'demo_seed', proof_image_url: demoProofUrl, admin_note: null, verified_by: ids.admin, verified_at: iso(-2 * day), created_at: iso(-2 * day) },
    { id: 'deposit-collector-seed', user_id: ids.collector, amount: 1500000, status: 'verified', method: 'demo_seed', proof_image_url: demoProofUrl, admin_note: null, verified_by: ids.admin, verified_at: iso(-2 * day), created_at: iso(-2 * day) }
  ];

  const depositBankAccount: DepositBankAccount = {
    id: 'primary',
    bank_name: 'BCA',
    account_number: '1234567890',
    account_holder_name: 'PT LelangBID Indonesia',
    instructions: 'Transfer sesuai nominal deposit, lalu upload bukti transfer dari dashboard.',
    updated_at: createdAt
  };

  const sellerApplications: SellerApplication[] = [];

  return { users, categories, jerseys, jerseyImages, auctions, bids, winners, payments, shipments, certificates, notifications, deposits, depositBankAccount, sellerApplications };
};

const hydrateState = (state: DemoState): DemoState => ({
  ...state,
  users: state.users.map(user => ({
    ...user,
    deposit_balance: Number((user as any).deposit_balance || 0)
  })),
  jerseys: state.jerseys.map(jersey => ({
    ...jersey,
    auction_start_time: jersey.auction_start_time || iso(12 * hour),
    auction_end_time: jersey.auction_end_time || iso(3 * day),
    auction_start_price: Number(jersey.auction_start_price || 1000000),
    reserve_price: Number(jersey.reserve_price || Math.max(Number(jersey.auction_start_price || 1000000), 1500000))
  })),
  auctions: state.auctions.map(auction => ({
    ...auction,
    reserve_price: Number(auction.reserve_price || Math.max(Number(auction.start_price || 0), Number(auction.current_price || 0)))
  })),
  deposits: (state.deposits || []) as DepositTransaction[],
  sellerApplications: (state.sellerApplications || []) as SellerApplication[],
  depositBankAccount: state.depositBankAccount || {
    id: 'primary',
    bank_name: 'BCA',
    account_number: '1234567890',
    account_holder_name: 'PT LelangBID Indonesia',
    instructions: 'Transfer sesuai nominal deposit, lalu upload bukti transfer dari dashboard.',
    updated_at: new Date().toISOString()
  }
});

const loadState = (): DemoState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const state = hydrateState(JSON.parse(stored) as DemoState);
    syncDemoAuctionStatuses(state);
    saveState(state);
    return state;
  }
  const state = initialState();
  syncDemoAuctionStatuses(state);
  saveState(state);
  return state;
};

const saveState = (state: DemoState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const syncDemoAuctionStatuses = (state: DemoState) => {
  const currentTime = Date.now();
  let changed = false;

  state.auctions.forEach(auction => {
    if (auction.status === 'upcoming' && new Date(auction.start_time).getTime() <= currentTime) {
      auction.status = 'live';
      changed = true;
    }

    if (auction.status !== 'live' || new Date(auction.end_time).getTime() > currentTime) return;

    const highestBid = [...state.bids]
      .filter(bid => bid.auction_id === auction.id)
      .sort((a, b) => b.bid_amount - a.bid_amount)[0];

    if (!highestBid) {
      auction.status = 'failed';
      auction.winner_user_id = null;
      changed = true;
      return;
    }

    auction.current_price = highestBid.bid_amount;
    auction.winner_user_id = highestBid.user_id;

    const reservePrice = Number(auction.reserve_price || 0);
    if (reservePrice > 0 && highestBid.bid_amount < reservePrice) {
      auction.status = 'negotiation';
      changed = true;
      return;
    }

    auction.status = 'closed';
    if (!state.winners.some(winner => winner.auction_id === auction.id)) {
      state.winners.push({
        id: nextId('winner'),
        auction_id: auction.id,
        user_id: highestBid.user_id,
        final_price: highestBid.bid_amount,
        status: 'waiting_payment',
        payment_deadline: new Date(currentTime + 24 * hour).toISOString(),
        created_at: new Date().toISOString()
      });
    }
    changed = true;
  });

  return changed;
};

const parseBody = (data: any) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (data instanceof FormData) {
    return Object.fromEntries(data.entries());
  }
  return data;
};

const getTokenUserId = (config: AxiosRequestConfig) => {
  const headers = config.headers as any;
  const auth = headers?.Authorization || headers?.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const token = auth.replace('Bearer ', '');
  if (!token.startsWith('demo-token-')) return null;
  return token.replace('demo-token-', '');
};

const publicUser = (user: User) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  depositBalance: Number(user.deposit_balance || 0)
});

const requireUser = (state: DemoState, config: AxiosRequestConfig) => {
  const userId = getTokenUserId(config);
  const user = state.users.find(u => u.id === userId);
  if (!user) throw Object.assign(new Error('Authentication token is missing'), { status: 401 });
  return user;
};

const requireRole = (user: User, roles: Role[]) => {
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error('Forbidden: Insufficient permissions'), { status: 403 });
  }
};

const categoryById = (state: DemoState, id: string) => state.categories.find(c => c.id === id);
const userById = (state: DemoState, id: string) => state.users.find(u => u.id === id);
const jerseyImages = (state: DemoState, jerseyId: string) =>
  state.jerseyImages.filter(img => img.jersey_id === jerseyId).sort((a, b) => a.sort_order - b.sort_order);

const enrichedJersey = (state: DemoState, jersey: Jersey) => ({
  ...jersey,
  category_name: categoryById(state, jersey.category_id)?.name,
  seller_name: userById(state, jersey.seller_id)?.full_name,
  images: jerseyImages(state, jersey.id)
});

const enrichedAuction = (state: DemoState, auction: Auction) => {
  const jersey = state.jerseys.find(j => j.id === auction.jersey_id);
  const category = jersey ? categoryById(state, jersey.category_id) : undefined;
  const winner = state.winners.find(w => w.auction_id === auction.id);
  return {
    ...auction,
    final_price: winner?.final_price,
    jersey_title: jersey?.title,
    condition: jersey?.condition,
    size: jersey?.size,
    is_signed: jersey?.is_signed,
    has_coa: jersey?.has_coa,
    seller_id: jersey?.seller_id,
    category_name: category?.name,
    category_slug: category?.slug,
    main_image: jersey ? jerseyImages(state, jersey.id)[0]?.image_url : undefined
  };
};

const auctionDetail = (state: DemoState, id: string) => {
  const auction = state.auctions.find(a => a.id === id);
  if (!auction) return null;
  const jersey = state.jerseys.find(j => j.id === auction.jersey_id);
  if (!jersey) return null;
  const category = categoryById(state, jersey.category_id);
  const seller = userById(state, jersey.seller_id);
  const bids = state.bids
    .filter(b => b.auction_id === auction.id)
    .sort((a, b) => b.bid_amount - a.bid_amount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(bid => ({ ...bid, user_name: userById(state, bid.user_id)?.full_name }));
  const coa = state.certificates.find(cert => cert.jersey_id === jersey.id && cert.status === 'valid') || null;

  return {
    ...auction,
    jersey_title: jersey.title,
    player_name: jersey.player_name,
    club_name: jersey.club_name,
    league_name: jersey.league_name,
    season: jersey.season,
    size: jersey.size,
    condition: jersey.condition,
    jersey_type: jersey.jersey_type,
    is_signed: jersey.is_signed,
    has_coa: jersey.has_coa,
    description: jersey.description,
    seller_id: jersey.seller_id,
    category_name: category?.name,
    seller_name: seller?.full_name,
    images: jerseyImages(state, jersey.id).map(img => ({ id: img.id, image_url: img.image_url })),
    bids,
    coa
  };
};

const paymentRows = (state: DemoState, user?: User) => {
  const rows = state.payments.map(payment => {
    const winner = state.winners.find(w => w.id === payment.winner_id);
    const auction = state.auctions.find(a => a.id === winner?.auction_id);
    const jersey = state.jerseys.find(j => j.id === auction?.jersey_id);
    return {
      ...payment,
      final_price: winner?.final_price,
      auction_id: winner?.auction_id,
      jersey_title: jersey?.title,
      user_name: userById(state, payment.user_id)?.full_name
    };
  });

  return user && user.role !== 'admin' ? rows.filter(row => row.user_id === user.id) : rows;
};

const shipmentRows = (state: DemoState, user?: User) => {
  const rows = state.shipments.map(shipment => {
    const winner = state.winners.find(w => w.id === shipment.winner_id);
    const auction = state.auctions.find(a => a.id === winner?.auction_id);
    const jersey = state.jerseys.find(j => j.id === auction?.jersey_id);
    return {
      ...shipment,
      final_price: winner?.final_price,
      start_price: auction?.start_price,
      start_time: auction?.start_time,
      end_time: auction?.end_time,
      jersey_title: jersey?.title,
      seller_id: jersey?.seller_id,
      winner_name: userById(state, winner?.user_id || '')?.full_name
    };
  });

  if (!user || user.role === 'admin') return rows;
  if (user.role === 'seller') return rows.filter(row => row.seller_id === user.id);
  return rows.filter(row => state.winners.find(w => w.id === row.winner_id)?.user_id === user.id);
};

const certificateRows = (state: DemoState) =>
  state.certificates.map(cert => {
    const jersey = state.jerseys.find(j => j.id === cert.jersey_id);
    return {
      ...cert,
      jersey_title: jersey?.title,
      seller_name: userById(state, jersey?.seller_id || '')?.full_name
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));

const winningRows = (state: DemoState, user: User) =>
  state.winners
    .filter(w => w.user_id === user.id)
    .map(winner => {
      const auction = state.auctions.find(a => a.id === winner.auction_id);
      const jersey = state.jerseys.find(j => j.id === auction?.jersey_id);
      const shipment = state.shipments.find(s => s.winner_id === winner.id);
      return {
        ...winner,
        jersey_title: jersey?.title,
        jersey_id: jersey?.id,
        auction_id: auction?.id,
        main_image: jersey ? jerseyImages(state, jersey.id)[0]?.image_url : undefined,
        courier: shipment?.courier,
        tracking_number: shipment?.tracking_number,
        shipment_status: shipment?.status
      };
    });

const stats = (state: DemoState) => ({
  totalUsers: state.users.length,
  totalJerseys: state.jerseys.length,
  activeAuctions: state.auctions.filter(a => a.status === 'live').length,
  closedAuctions: state.auctions.filter(a => a.status === 'closed').length,
  totalRevenue: state.winners.filter(w => w.status === 'completed').reduce((sum, row) => sum + row.final_price, 0),
  pendingPayments: state.winners.filter(w => w.status === 'waiting_payment').length,
  pendingShipments: state.shipments.filter(s => s.status === 'pending').length,
  pendingSellerApplications: state.sellerApplications.filter(application => application.status === 'pending').length
});

const response = (config: AxiosRequestConfig, data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: status >= 400 ? 'Error' : 'OK',
  headers: {},
  config: config as any,
  request: {}
});

const errorResponse = (config: AxiosRequestConfig, message: string, status: number) =>
  Promise.reject({ response: response(config, { message }, status), config });

export const demoApiAdapter: AxiosAdapter = async (config) => {
  const state = loadState();
  const method = (config.method || 'get').toLowerCase();
  const rawUrl = config.url || '/';
  const parsedUrl = new URL(rawUrl, 'https://demo.local');
  const path = parsedUrl.pathname.replace(/^\/api/, '');
  const body = parseBody(config.data);

  try {
    if (method === 'post' && path === '/auth/login') {
      const user = state.users.find(u => u.email === body.email);
      if (!user || user.password !== body.password) return errorResponse(config, 'Invalid email or password', 400);
      if (user.status !== 'active') return errorResponse(config, 'Your account is suspended', 403);
      return response(config, { token: `demo-token-${user.id}`, user: publicUser(user) });
    }

    if (method === 'post' && path === '/auth/register') {
      if (state.users.some(u => u.email === body.email)) return errorResponse(config, 'Email is already registered', 400);
      const user: User = {
        id: nextId('user'),
        full_name: body.fullName,
        email: body.email,
        phone: body.phone || '',
        password: body.password,
        role: 'member',
        status: 'active',
        deposit_balance: 0,
        created_at: new Date().toISOString()
      };
      state.users.push(user);
      saveState(state);
      return response(config, { token: `demo-token-${user.id}`, user: publicUser(user) }, 201);
    }

    if (method === 'get' && path === '/auth/me') {
      const user = requireUser(state, config);
      return response(config, publicUser(user));
    }

    if (method === 'get' && path === '/seller-applications/me') {
      const user = requireUser(state, config);
      const application = [...state.sellerApplications]
        .filter(row => row.user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
      return response(config, { currentRole: user.role, application });
    }

    if (method === 'post' && path === '/seller-applications') {
      const user = requireUser(state, config);
      if (user.role === 'seller' || user.role === 'admin') return errorResponse(config, 'This account already has seller access', 400);
      if (state.sellerApplications.some(row => row.user_id === user.id && row.status === 'pending')) {
        return errorResponse(config, 'Your seller application is already waiting for admin approval', 400);
      }

      const application: SellerApplication = {
        id: nextId('seller-application'),
        user_id: user.id,
        store_name: String(body.storeName || ''),
        reason: String(body.reason || ''),
        status: 'pending',
        admin_note: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString()
      };
      state.sellerApplications.push(application);
      state.notifications.push({
        id: nextId('notif'),
        user_id: user.id,
        title: 'Seller Application Submitted',
        message: 'Your seller application is waiting for admin approval.',
        type: 'seller_application',
        is_read: 0,
        created_at: new Date().toISOString()
      });
      saveState(state);
      return response(config, { message: 'Seller application submitted. Waiting for admin approval.', applicationId: application.id, status: application.status }, 201);
    }

    if (method === 'get' && path === '/deposits/me') {
      const user = requireUser(state, config);
      const transactions = state.deposits
        .filter(deposit => deposit.user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10);

      return response(config, {
        depositBalance: Number(user.deposit_balance || 0),
        bankAccount: state.depositBankAccount,
        bidDepositRate: 0,
        bidDepositMinimum: BID_DEPOSIT_REQUIRED,
        bidDepositRequired: BID_DEPOSIT_REQUIRED,
        depositRefundRate: DEPOSIT_REFUND_RATE,
        depositForfeitRate: DEPOSIT_FORFEIT_RATE,
        depositRequestMinimum: DEPOSIT_REQUEST_MINIMUM,
        transactions
      });
    }

    if (method === 'get' && path === '/deposits/bank-account') {
      requireUser(state, config);
      return response(config, { bankAccount: state.depositBankAccount });
    }

    if (method === 'patch' && path === '/deposits/bank-account') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);

      if (!body.bankName || !body.accountNumber || !body.accountHolderName) {
        return errorResponse(config, 'Bank name, account number, and account holder name are required', 400);
      }

      state.depositBankAccount = {
        id: 'primary',
        bank_name: String(body.bankName),
        account_number: String(body.accountNumber),
        account_holder_name: String(body.accountHolderName),
        instructions: String(body.instructions || ''),
        updated_at: new Date().toISOString()
      };
      saveState(state);
      return response(config, { message: 'Deposit bank account updated successfully', bankAccount: state.depositBankAccount });
    }

    if (method === 'post' && path === '/deposits/request') {
      const user = requireUser(state, config);
      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount < DEPOSIT_REQUEST_MINIMUM) {
        return errorResponse(config, `Minimum deposit request is Rp ${DEPOSIT_REQUEST_MINIMUM.toLocaleString('id-ID')}`, 400);
      }

      if (!state.depositBankAccount) {
        return errorResponse(config, 'Deposit bank account has not been configured by admin', 400);
      }

      const requiredShortfall = Math.max(0, BID_DEPOSIT_REQUIRED - Number(user.deposit_balance || 0));
      if (requiredShortfall === 0) {
        return errorResponse(config, 'Your bidding deposit is already active', 400);
      }

      if (amount < requiredShortfall) {
        return errorResponse(config, `Deposit request must be at least Rp ${requiredShortfall.toLocaleString('id-ID')} to activate bidding`, 400);
      }

      if (state.deposits.some(deposit => deposit.user_id === user.id && deposit.status === 'pending_verification')) {
        return errorResponse(config, 'You already have a deposit request waiting for admin verification', 400);
      }

      const deposit: DepositTransaction = {
        id: nextId('deposit'),
        user_id: user.id,
        amount,
        status: 'pending_verification',
        method: 'bank_transfer',
        proof_image_url: demoProofUrl,
        admin_note: null,
        verified_by: null,
        verified_at: null,
        created_at: new Date().toISOString()
      };

      state.deposits.push(deposit);
      state.notifications.push({
        id: nextId('notif'),
        user_id: ids.admin,
        title: 'Deposit waiting for verification',
        message: `${user.full_name} uploaded a deposit proof for Rp ${amount.toLocaleString('id-ID')}.`,
        type: 'deposit',
        is_read: 0,
        created_at: new Date().toISOString()
      });
      saveState(state);

      return response(config, {
        message: 'Deposit request submitted. Waiting for admin verification.',
        depositId: deposit.id,
        status: deposit.status,
        bidDepositRate: 0,
        bidDepositMinimum: BID_DEPOSIT_REQUIRED,
        bidDepositRequired: BID_DEPOSIT_REQUIRED,
        depositRefundRate: DEPOSIT_REFUND_RATE,
        depositRequestMinimum: DEPOSIT_REQUEST_MINIMUM
      }, 201);
    }

    if (method === 'get' && path === '/deposits/admin/requests') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const status = parsedUrl.searchParams.get('status');
      let rows = state.deposits;
      if (status) rows = rows.filter(deposit => deposit.status === status);

      return response(config, rows
        .map(deposit => {
          const owner = userById(state, deposit.user_id);
          return {
            ...deposit,
            user_name: owner?.full_name,
            user_email: owner?.email,
            deposit_balance: owner?.deposit_balance || 0
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      );
    }

    const verifyDepositMatch = path.match(/^\/deposits\/admin\/requests\/([^/]+)\/verify$/);
    if (method === 'patch' && verifyDepositMatch) {
      const admin = requireUser(state, config);
      requireRole(admin, ['admin']);
      const deposit = state.deposits.find(row => row.id === verifyDepositMatch[1]);
      if (!deposit) return errorResponse(config, 'Deposit request not found', 404);
      if (deposit.status !== 'pending_verification') return errorResponse(config, `Deposit request is already ${deposit.status}`, 400);
      if (!['verified', 'rejected'].includes(body.status)) return errorResponse(config, 'Valid status (verified or rejected) is required', 400);

      deposit.status = body.status;
      deposit.admin_note = body.adminNote || null;
      deposit.verified_by = admin.id;
      deposit.verified_at = new Date().toISOString();

      const owner = userById(state, deposit.user_id);
      if (body.status === 'verified' && owner) {
        owner.deposit_balance = Number(owner.deposit_balance || 0) + deposit.amount;
      }

      state.notifications.push({
        id: nextId('notif'),
        user_id: deposit.user_id,
        title: body.status === 'verified' ? 'Deposit Verified' : 'Deposit Rejected',
        message: body.status === 'verified'
          ? `Your security deposit of Rp ${deposit.amount.toLocaleString('id-ID')} has been verified. You can now place bids.`
          : 'Your deposit transfer could not be verified. Please submit a valid transfer proof.',
        type: body.status === 'verified' ? 'deposit' : 'deposit_rejected',
        is_read: 0,
        created_at: new Date().toISOString()
      });

      saveState(state);
      return response(config, { message: `Deposit request marked as ${body.status}`, status: body.status, depositBalance: owner?.deposit_balance || 0 });
    }

    if (method === 'get' && path === '/jerseys/categories') {
      return response(config, [...state.categories].sort((a, b) => a.name.localeCompare(b.name)));
    }

    if (method === 'get' && path === '/jerseys') {
      const user = requireUser(state, config);
      const status = parsedUrl.searchParams.get('status');
      let rows = state.jerseys;
      if (user.role === 'seller') rows = rows.filter(j => j.seller_id === user.id);
      if (user.role === 'member') rows = rows.filter(j => j.status === 'verified');
      if (user.role === 'admin' && status) rows = rows.filter(j => j.status === status);
      return response(config, rows.map(j => enrichedJersey(state, j)));
    }

    if (method === 'post' && path === '/jerseys') {
      const user = requireUser(state, config);
      requireRole(user, ['seller', 'admin']);
      const jerseyId = nextId('jersey');
      const imageUrl = image('photo-1508098682722-e99c43a406b2');
      const jersey: Jersey = {
        id: jerseyId,
        category_id: String(body.categoryId),
        seller_id: user.id,
        title: String(body.title),
        player_name: String(body.playerName || ''),
        club_name: String(body.clubName || ''),
        league_name: String(body.leagueName || ''),
        season: String(body.season || ''),
        size: String(body.size || 'L'),
        condition: String(body.condition || 'Excellent'),
        jersey_type: String(body.jerseyType || 'classic-jersey'),
        is_signed: body.isSigned === 'true' ? 1 : 0,
        has_coa: body.hasCoa === 'true' ? 1 : 0,
        description: String(body.description || ''),
        auction_start_time: String(body.auctionStartTime || ''),
        auction_end_time: String(body.auctionEndTime || ''),
        auction_start_price: Number(body.auctionStartPrice || 0),
        reserve_price: Number(body.reservePrice || 0),
        status: user.role === 'admin' ? 'verified' : 'pending_verification',
        created_at: new Date().toISOString()
      };
      state.jerseys.push(jersey);
      state.jerseyImages.push({ id: nextId('image'), jersey_id: jerseyId, image_url: imageUrl, sort_order: 0 });
      state.notifications.push({ id: nextId('notif'), user_id: user.id, title: 'Jersey Submitted', message: `${jersey.title} is waiting for admin verification.`, type: 'jersey', is_read: 0, created_at: new Date().toISOString() });
      saveState(state);
      return response(config, { message: 'Jersey listing submitted successfully', jerseyId, status: jersey.status }, 201);
    }

    if (method === 'get' && path === '/auctions') {
      const status = parsedUrl.searchParams.get('status');
      const categorySlug = parsedUrl.searchParams.get('categorySlug');
      let rows = state.auctions.map(a => enrichedAuction(state, a));
      if (status) rows = rows.filter((a: any) => a.status === status);
      if (categorySlug) rows = rows.filter((a: any) => a.category_slug === categorySlug);
      rows.sort((a: any, b: any) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
      return response(config, rows);
    }

    const auctionDetailMatch = path.match(/^\/auctions\/([^/]+)$/);
    if (method === 'get' && auctionDetailMatch) {
      const detail = auctionDetail(state, auctionDetailMatch[1]);
      if (!detail) return errorResponse(config, 'Auction not found', 404);
      return response(config, detail);
    }

    if (method === 'post' && path === '/auctions') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);

      if (!body.jerseyId || !body.startPrice || !body.startTime || !body.endTime) {
        return errorResponse(config, 'Jersey ID, start price, start time, and end time are required', 400);
      }

      const jersey = state.jerseys.find(j => j.id === body.jerseyId);
      if (!jersey) return errorResponse(config, 'Jersey not found', 404);
      if (jersey.status !== 'verified') return errorResponse(config, 'Only verified jerseys can be auctioned', 400);

      const activeAuction = state.auctions.find(
        auction => auction.jersey_id === jersey.id && ['upcoming', 'live', 'negotiation'].includes(auction.status)
      );
      if (activeAuction) return errorResponse(config, 'This jersey is already in an active or upcoming auction', 400);

      const auctionId = nextId('auction');
      const startPrice = Number(body.startPrice);
      const reservePrice = Number(body.reservePrice || jersey.reserve_price || 0);
      const minIncrement = getBidIncrementForAmount(startPrice);
      const start = new Date(body.startTime);
      const end = new Date(body.endTime);

      if (
        !Number.isFinite(startPrice) ||
        startPrice <= 0 ||
        !Number.isFinite(reservePrice) ||
        reservePrice < 0
      ) {
        return errorResponse(config, 'Auction prices must be valid positive numbers', 400);
      }

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return errorResponse(config, 'Start time and end time must be valid dates', 400);
      }

      if (end <= start) return errorResponse(config, 'End time must be after start time', 400);
      if (reservePrice > 0 && reservePrice < startPrice) {
        return errorResponse(config, 'Final minimum price must be greater than or equal to the starting price', 400);
      }

      const auction: Auction = {
        id: auctionId,
        jersey_id: jersey.id,
        start_price: startPrice,
        current_price: startPrice,
        min_increment: minIncrement,
        reserve_price: reservePrice,
        start_time: body.startTime,
        end_time: body.endTime,
        status: start <= new Date() ? 'live' : 'upcoming',
        winner_user_id: null,
        created_at: new Date().toISOString()
      };
      state.auctions.push(auction);
      saveState(state);
      return response(config, { message: 'Auction created successfully', auctionId, status: auction.status }, 201);
    }

    const sellerDecisionMatch = path.match(/^\/auctions\/([^/]+)\/seller-decision$/);
    if (method === 'patch' && sellerDecisionMatch) {
      const user = requireUser(state, config);
      requireRole(user, ['seller', 'admin']);
      const auction = state.auctions.find(a => a.id === sellerDecisionMatch[1]);
      if (!auction) return errorResponse(config, 'Auction not found', 404);
      const jersey = state.jerseys.find(j => j.id === auction.jersey_id);
      if (user.role === 'seller' && jersey?.seller_id !== user.id) return errorResponse(config, 'Forbidden: This is not your auction', 403);
      if (auction.status !== 'negotiation') return errorResponse(config, `Auction is not waiting for seller negotiation. Current status: ${auction.status}`, 400);
      if (!['accepted', 'rejected'].includes(body.decision)) return errorResponse(config, 'Decision must be accepted or rejected', 400);

      const highestBid = [...state.bids]
        .filter(bid => bid.auction_id === auction.id)
        .sort((a, b) => b.bid_amount - a.bid_amount)[0];

      if (!highestBid) {
        auction.status = 'failed';
        auction.winner_user_id = null;
        saveState(state);
        return response(config, { message: 'Auction marked as failed because there were no bids', status: auction.status });
      }

      if (body.decision === 'accepted') {
        auction.status = 'closed';
        auction.winner_user_id = highestBid.user_id;
        auction.current_price = highestBid.bid_amount;

        if (!state.winners.some(winner => winner.auction_id === auction.id)) {
          state.winners.push({
            id: nextId('winner'),
            auction_id: auction.id,
            user_id: highestBid.user_id,
            final_price: highestBid.bid_amount,
            status: 'waiting_payment',
            payment_deadline: iso(24 * hour),
            created_at: new Date().toISOString()
          });
        }
      } else {
        auction.status = 'failed';
        auction.winner_user_id = null;
      }

      saveState(state);
      return response(config, {
        message: body.decision === 'accepted'
          ? 'Seller accepted the negotiated price. Auction is successful.'
          : 'Seller rejected the negotiated price. Auction is not successful.',
        status: auction.status
      });
    }

    const bidMatch = path.match(/^\/auctions\/([^/]+)\/bid$/);
    if (method === 'post' && bidMatch) {
      const user = requireUser(state, config);
      const auction = state.auctions.find(a => a.id === bidMatch[1]);
      if (!auction) return errorResponse(config, 'Auction not found', 404);
      const jersey = state.jerseys.find(j => j.id === auction.jersey_id);
      if (auction.status !== 'live') return errorResponse(config, 'Bids are only allowed on live auctions.', 400);
      if (jersey?.seller_id === user.id) return errorResponse(config, 'You cannot bid on your own jersey auction', 400);
      const bidAmount = Number(body.bidAmount);
      if (!Number.isFinite(bidAmount) || bidAmount <= 0) return errorResponse(config, 'A valid bid amount is required', 400);
      const bidsCount = state.bids.filter(b => b.auction_id === auction.id).length;
      const minAllowed = getNextMinimumBid(auction.current_price, auction.start_price, bidsCount);
      if (bidAmount < minAllowed) return errorResponse(config, `Bid amount must be at least Rp ${minAllowed.toLocaleString('id-ID')}`, 400);
      const requiredDeposit = BID_DEPOSIT_REQUIRED;
      const depositBalance = Number(user.deposit_balance || 0);
      if (user.role !== 'admin' && depositBalance < requiredDeposit) {
        const depositShortfall = requiredDeposit - depositBalance;
        return Promise.reject({
          response: response(config, {
            message: `Security deposit must be verified at Rp ${requiredDeposit.toLocaleString('id-ID')} before bidding. Please submit a deposit request for Rp ${depositShortfall.toLocaleString('id-ID')} and wait for admin verification.`,
            depositBalance,
            requiredDeposit,
            depositShortfall,
            bidDepositRate: 0,
            bidDepositMinimum: BID_DEPOSIT_REQUIRED,
            bidDepositRequired: BID_DEPOSIT_REQUIRED,
            depositRefundRate: DEPOSIT_REFUND_RATE,
            depositForfeitRate: DEPOSIT_FORFEIT_RATE,
            depositRequestMinimum: DEPOSIT_REQUEST_MINIMUM
          }, 402),
          config
        });
      }
      const bidId = nextId('bid');
      state.bids.push({ id: bidId, auction_id: auction.id, user_id: user.id, bid_amount: bidAmount, created_at: new Date().toISOString() });
      auction.current_price = bidAmount;
      saveState(state);
      return response(config, { message: 'Bid placed successfully', bidId, currentPrice: bidAmount, endTime: auction.end_time, extended: false }, 201);
    }

    if (method === 'get' && path === '/payments') {
      const user = requireUser(state, config);
      return response(config, paymentRows(state, user));
    }

    if (method === 'post' && path === '/payments/upload-proof') {
      const user = requireUser(state, config);
      const winner = state.winners.find(w => w.id === body.winnerId && w.user_id === user.id);
      if (!winner) return errorResponse(config, 'Auction winner record not found', 404);
      winner.status = 'waiting_verification';
      const existingPayment = state.payments.find(p => p.winner_id === winner.id);
      if (existingPayment) {
        existingPayment.amount = Number(body.amount || winner.final_price);
        existingPayment.proof_image_url = demoProofUrl;
        existingPayment.status = 'pending_verification';
        existingPayment.paid_at = new Date().toISOString();
      } else {
        state.payments.push({ id: nextId('payment'), winner_id: winner.id, user_id: user.id, amount: Number(body.amount || winner.final_price), proof_image_url: demoProofUrl, status: 'pending_verification', paid_at: new Date().toISOString(), created_at: new Date().toISOString() });
      }
      if (!state.shipments.some(s => s.winner_id === winner.id)) {
        state.shipments.push({ id: nextId('shipment'), winner_id: winner.id, recipient_name: String(body.recipientName || user.full_name), address: String(body.address || 'Demo Address'), courier: String(body.courier || 'JNE Reguler'), tracking_number: null, status: 'pending', created_at: new Date().toISOString() });
      }
      saveState(state);
      return response(config, { message: 'Payment proof uploaded successfully', paymentId: existingPayment?.id || state.payments.at(-1)?.id });
    }

    const verifyPaymentMatch = path.match(/^\/payments\/([^/]+)\/verify$/);
    if (method === 'patch' && verifyPaymentMatch) {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const payment = state.payments.find(p => p.id === verifyPaymentMatch[1]);
      if (!payment) return errorResponse(config, 'Payment record not found', 404);
      payment.status = body.status;
      const winner = state.winners.find(w => w.id === payment.winner_id);
      if (winner) winner.status = body.status === 'verified' ? 'paid' : 'waiting_payment';
      saveState(state);
      return response(config, { message: `Payment verified as ${body.status}`, winnerStatus: winner?.status });
    }

    if (method === 'get' && path === '/shipments') {
      const user = requireUser(state, config);
      return response(config, shipmentRows(state, user));
    }

    const shipmentPatch = path.match(/^\/shipments\/([^/]+)$/);
    if (method === 'patch' && shipmentPatch) {
      const user = requireUser(state, config);
      requireRole(user, ['admin', 'seller']);
      const shipment = state.shipments.find(s => s.id === shipmentPatch[1]);
      if (!shipment) return errorResponse(config, 'Shipment record not found', 404);
      shipment.courier = body.courier || shipment.courier;
      shipment.tracking_number = body.trackingNumber || shipment.tracking_number;
      shipment.status = body.status;
      const winner = state.winners.find(w => w.id === shipment.winner_id);
      if (winner) winner.status = body.status === 'delivered' ? 'completed' : body.status === 'shipped' ? 'shipped' : winner.status;
      saveState(state);
      return response(config, { message: 'Shipment updated successfully', status: shipment.status, trackingNumber: shipment.tracking_number });
    }

    if (method === 'get' && path === '/certificates') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      return response(config, certificateRows(state));
    }

    const verifyCoaMatch = path.match(/^\/certificates\/verify\/(.+)$/);
    if (method === 'get' && verifyCoaMatch) {
      const cert = state.certificates.find(c => c.coa_number === decodeURIComponent(verifyCoaMatch[1]));
      if (!cert) return errorResponse(config, 'Certificate of Authenticity not found', 404);
      const jersey = state.jerseys.find(j => j.id === cert.jersey_id);
      return response(config, { ...cert, ...jersey, main_image: jersey ? jerseyImages(state, jersey.id)[0]?.image_url : undefined });
    }

    if (method === 'post' && path === '/certificates') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const jersey = state.jerseys.find(j => j.id === body.jerseyId);
      if (!jersey) return errorResponse(config, 'Jersey not found', 404);
      if (state.certificates.some(c => c.jersey_id === jersey.id)) return errorResponse(config, 'A certificate already exists for this jersey', 400);
      const coaNumber = body.coaNumber || `COA-DEMO-${Date.now()}`;
      state.certificates.push({ id: nextId('cert'), jersey_id: jersey.id, coa_number: coaNumber, qr_code_url: `/verify/${coaNumber}`, verifier_name: body.verifierName, status: 'valid', created_at: new Date().toISOString() });
      jersey.has_coa = 1;
      saveState(state);
      return response(config, { message: 'Certificate of Authenticity created successfully', certificateId: state.certificates.at(-1)?.id, coaNumber, qrCodeUrl: `/verify/${coaNumber}` }, 201);
    }

    if (method === 'get' && path === '/notifications') {
      const user = requireUser(state, config);
      return response(config, state.notifications.filter(n => n.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }

    const readNotifMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
    if (method === 'patch' && readNotifMatch) {
      const user = requireUser(state, config);
      const notif = state.notifications.find(n => n.id === readNotifMatch[1] && n.user_id === user.id);
      if (!notif) return errorResponse(config, 'Notification not found', 404);
      notif.is_read = 1;
      saveState(state);
      return response(config, { message: 'Notification marked as read' });
    }

    if (method === 'get' && path === '/notifications/winnings') {
      const user = requireUser(state, config);
      return response(config, winningRows(state, user));
    }

    if (method === 'get' && path === '/admin/stats') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      return response(config, stats(state));
    }

    if (method === 'get' && path === '/admin/users') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      return response(config, state.users.map(userRow => {
        const row = { ...userRow } as Partial<User>;
        delete row.password;
        return row;
      }));
    }

    if (method === 'get' && path === '/admin/seller-applications') {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const status = parsedUrl.searchParams.get('status');
      let rows = state.sellerApplications;
      if (status) rows = rows.filter(application => application.status === status);

      return response(config, rows
        .map(application => {
          const owner = userById(state, application.user_id);
          return {
            ...application,
            user_name: owner?.full_name,
            user_email: owner?.email,
            user_phone: owner?.phone,
            current_role: owner?.role
          };
        })
        .sort((a, b) => {
          const rank = (value: string) => value === 'pending' ? 0 : value === 'approved' ? 1 : 2;
          return rank(a.status) - rank(b.status) || b.created_at.localeCompare(a.created_at);
        }));
    }

    const sellerApplicationVerify = path.match(/^\/admin\/seller-applications\/([^/]+)\/verify$/);
    if (method === 'patch' && sellerApplicationVerify) {
      const admin = requireUser(state, config);
      requireRole(admin, ['admin']);
      const application = state.sellerApplications.find(row => row.id === sellerApplicationVerify[1]);
      if (!application) return errorResponse(config, 'Seller application not found', 404);
      if (application.status !== 'pending') return errorResponse(config, `Seller application is already ${application.status}`, 400);
      if (!['approved', 'rejected'].includes(body.status)) return errorResponse(config, 'Valid status (approved or rejected) is required', 400);

      application.status = body.status;
      application.admin_note = body.adminNote || null;
      application.reviewed_by = admin.id;
      application.reviewed_at = new Date().toISOString();

      const applicant = userById(state, application.user_id);
      if (body.status === 'approved' && applicant) {
        applicant.role = 'seller';
      }

      state.notifications.push({
        id: nextId('notif'),
        user_id: application.user_id,
        title: body.status === 'approved' ? 'Seller Application Approved' : 'Seller Application Rejected',
        message: body.status === 'approved'
          ? 'Your account has been upgraded to seller. You can now access Seller Center.'
          : `Your seller application was rejected.${body.adminNote ? ` Note: ${body.adminNote}` : ''}`,
        type: 'seller_application',
        is_read: 0,
        created_at: new Date().toISOString()
      });
      saveState(state);
      return response(config, { message: `Seller application ${body.status}`, status: body.status });
    }

    const adminUserPatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (method === 'patch' && adminUserPatch) {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const target = state.users.find(u => u.id === adminUserPatch[1]);
      if (!target) return errorResponse(config, 'User not found', 404);
      if (body.role) target.role = body.role;
      if (body.status) target.status = body.status;
      saveState(state);
      return response(config, { message: 'User updated successfully' });
    }

    const adminJerseyVerify = path.match(/^\/admin\/jerseys\/([^/]+)\/verify$/);
    if (method === 'patch' && adminJerseyVerify) {
      const user = requireUser(state, config);
      requireRole(user, ['admin']);
      const jersey = state.jerseys.find(j => j.id === adminJerseyVerify[1]);
      if (!jersey) return errorResponse(config, 'Jersey not found', 404);
      jersey.status = body.status;
      saveState(state);
      return response(config, { message: `Jersey listing marked as ${body.status}` });
    }

    return errorResponse(config, `Demo endpoint not implemented: ${method.toUpperCase()} ${path}`, 404);
  } catch (err: any) {
    return errorResponse(config, err.message || 'Demo API error', err.status || 500);
  }
};
