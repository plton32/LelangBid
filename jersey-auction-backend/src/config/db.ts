// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../database.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some(column => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

export function initDb() {
  console.log(`Initializing SQLite database at: ${dbPath}`);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      deposit_balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS jerseys (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id),
      seller_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      player_name TEXT,
      club_name TEXT,
      league_name TEXT,
      season TEXT,
      size TEXT,
      condition TEXT,
      jersey_type TEXT,
      is_signed INTEGER DEFAULT 0,
      has_coa INTEGER DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS jersey_images (
      id TEXT PRIMARY KEY,
      jersey_id TEXT REFERENCES jerseys(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS auctions (
      id TEXT PRIMARY KEY,
      jersey_id TEXT REFERENCES jerseys(id) ON DELETE CASCADE,
      start_price REAL NOT NULL,
      current_price REAL DEFAULT 0,
      min_increment REAL DEFAULT 50000,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      winner_user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      auction_id TEXT REFERENCES auctions(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      bid_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS auction_winners (
      id TEXT PRIMARY KEY,
      auction_id TEXT REFERENCES auctions(id),
      user_id TEXT REFERENCES users(id),
      final_price REAL NOT NULL,
      status TEXT DEFAULT 'waiting_payment',
      payment_deadline TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      winner_id TEXT REFERENCES auction_winners(id),
      user_id TEXT REFERENCES users(id),
      amount REAL NOT NULL,
      proof_image_url TEXT,
      status TEXT DEFAULT 'waiting_upload',
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      amount REAL NOT NULL,
      status TEXT DEFAULT 'verified',
      method TEXT DEFAULT 'bank_transfer',
      proof_image_url TEXT,
      admin_note TEXT,
      verified_by TEXT REFERENCES users(id),
      verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS deposit_bank_accounts (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_holder_name TEXT NOT NULL,
      instructions TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS seller_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      store_name TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      winner_id TEXT REFERENCES auction_winners(id),
      recipient_name TEXT,
      address TEXT,
      courier TEXT,
      tracking_number TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      jersey_id TEXT REFERENCES jerseys(id),
      coa_number TEXT UNIQUE NOT NULL,
      qr_code_url TEXT,
      verifier_name TEXT,
      status TEXT DEFAULT 'valid',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  ensureColumn('users', 'deposit_balance', 'REAL DEFAULT 0');
  ensureColumn('deposits', 'proof_image_url', 'TEXT');
  ensureColumn('deposits', 'admin_note', 'TEXT');
  ensureColumn('deposits', 'verified_by', 'TEXT REFERENCES users(id)');
  ensureColumn('deposits', 'verified_at', 'TEXT');

  // Seed default data if users table is empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount === 0) {
    console.log('Seeding initial data...');
    
    // Seed users
    const salt = bcrypt.genSaltSync(10);
    const adminId = randomUUID();
    const sellerId = randomUUID();
    const memberId = randomUUID();

    const insertUser = db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role, status, deposit_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(adminId, 'Super Admin LelangBID', 'admin@lelangbid.com', '081234567890', bcrypt.hashSync('admin123', salt), 'admin', 'active', 0);
    insertUser.run(sellerId, 'Jersey Collector Seller', 'seller@lelangbid.com', '081234567891', bcrypt.hashSync('seller123', salt), 'seller', 'active', 0);
    insertUser.run(memberId, 'Andi Member', 'member@lelangbid.com', '081234567892', bcrypt.hashSync('member123', salt), 'member', 'active', 1000000);

    // Seed categories
    const catClassicId = randomUUID();
    const catSignedId = randomUUID();
    const catMatchWornId = randomUUID();

    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)
    `);
    insertCat.run(catClassicId, 'Classic Jersey', 'classic-jersey');
    insertCat.run(catSignedId, 'Signed Jersey', 'signed-jersey');
    insertCat.run(catMatchWornId, 'Match Worn Jersey', 'match-worn-jersey');

    // Seed jerseys
    const jersey1Id = randomUUID();
    const jersey2Id = randomUUID();
    const jersey3Id = randomUUID();

    const insertJersey = db.prepare(`
      INSERT INTO jerseys (id, category_id, seller_id, title, player_name, club_name, league_name, season, size, condition, jersey_type, is_signed, has_coa, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertJersey.run(
      jersey1Id,
      catMatchWornId,
      sellerId,
      'Manchester United 2007-08 Home - Match Worn Cristiano Ronaldo',
      'Cristiano Ronaldo',
      'Manchester United',
      'Premier League',
      '2007-2008',
      'L',
      'Match Worn - Excellent with slight stains',
      'match-worn-jersey',
      1,
      1,
      'Authentic match worn jersey of Cristiano Ronaldo during the historical 2007-08 season where MU won the Premier League and Champions League. Hand-signed on the back number 7.',
      'verified'
    );

    insertJersey.run(
      jersey2Id,
      catSignedId,
      sellerId,
      'Barcelona 2014-15 Home - Signed Lionel Messi with COA',
      'Lionel Messi',
      'Barcelona',
      'La Liga',
      '2014-2015',
      'M',
      'Mint Condition',
      'signed-jersey',
      1,
      1,
      'Official Barcelona 2014-15 Home jersey signed by Lionel Messi. Includes official certificate of authenticity (COA). Perfect item for high-end collectors.',
      'verified'
    );

    insertJersey.run(
      jersey3Id,
      catClassicId,
      sellerId,
      'Real Madrid 2002-03 Centenary Jersey - Zidane #5',
      'Zinedine Zidane',
      'Real Madrid',
      'La Liga',
      '2002-2003',
      'XL',
      'Very Good (9/10)',
      'classic-jersey',
      0,
      0,
      'Retro Real Madrid Centenary jersey celebrating 100 years of the club. Classic print of Zinedine Zidane #5 on the back.',
      'verified'
    );

    // Seed jersey images (mocking local URLs or placeholders)
    const insertImage = db.prepare(`
      INSERT INTO jersey_images (id, jersey_id, image_url, sort_order) VALUES (?, ?, ?, ?)
    `);
    
    // We can use premium-looking Unsplash placeholders of sports jerseys/action shots
    insertImage.run(randomUUID(), jersey1Id, 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop', 0);
    insertImage.run(randomUUID(), jersey2Id, 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600&auto=format&fit=crop', 0);
    insertImage.run(randomUUID(), jersey3Id, 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop', 0);

    // Seed auctions (upcoming, live, closed)
    const insertAuction = db.prepare(`
      INSERT INTO auctions (id, jersey_id, start_price, current_price, min_increment, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Live Auction: Starts 1 day ago, ends in 2 days
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const auction1Id = randomUUID();
    insertAuction.run(auction1Id, jersey1Id, 5000000, 5000000, 100000, oneDayAgo, inTwoDays, 'live');

    // 2. Upcoming Auction: Starts in 1 day, ends in 3 days
    const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const auction2Id = randomUUID();
    insertAuction.run(auction2Id, jersey2Id, 7500000, 7500000, 150000, inOneDay, inThreeDays, 'upcoming');

    // 3. Closed Auction: Started 3 days ago, ended 1 hour ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const auction3Id = randomUUID();
    insertAuction.run(auction3Id, jersey3Id, 2000000, 2300000, 50000, threeDaysAgo, oneHourAgo, 'closed');

    // Seed some bid history for closed auction
    const insertBid = db.prepare(`
      INSERT INTO bids (id, auction_id, user_id, bid_amount, created_at) VALUES (?, ?, ?, ?, ?)
    `);
    const bid1Time = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const bid2Time = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    
    insertBid.run(randomUUID(), auction3Id, memberId, 2150000, bid1Time);
    insertBid.run(randomUUID(), auction3Id, adminId, 2300000, bid2Time); // higher bid wins

    // Insert winner record for closed auction
    const winnerId = randomUUID();
    db.prepare(`
      INSERT INTO auction_winners (id, auction_id, user_id, final_price, status, payment_deadline)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(winnerId, auction3Id, adminId, 2300000, 'waiting_payment', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());

    // Create a COA for jersey 1
    db.prepare(`
      INSERT INTO certificates (id, jersey_id, coa_number, qr_code_url, verifier_name, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), jersey1Id, 'COA-CR7-MU0708-001', '/verify/COA-CR7-MU0708-001', 'Jersey Authenticator Agency', 'valid');

    // Create a COA for jersey 2
    db.prepare(`
      INSERT INTO certificates (id, jersey_id, coa_number, qr_code_url, verifier_name, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), jersey2Id, 'COA-MESSI-BAR1415-002', '/verify/COA-MESSI-BAR1415-002', 'LelangBID Verifier Group', 'valid');

    console.log('Seed data successfully inserted!');
  }
}

export default db;
