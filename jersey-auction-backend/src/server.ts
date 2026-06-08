import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';

// Load env vars
dotenv.config();

// Init Database
import { initDb } from './config/db';
import db from './config/db';
initDb();

import { ensureUploadDir } from './config/storage';
import { SseService } from './services/sse.service';

// Import routes
import authRoutes from './routes/auth.routes';
import jerseyRoutes from './routes/jerseys.routes';
import auctionRoutes from './routes/auctions.routes';
import paymentRoutes from './routes/payments.routes';
import shipmentRoutes from './routes/shipments.routes';
import certificateRoutes from './routes/certificates.routes';
import notificationRoutes from './routes/notifications.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
const PORT = process.env.PORT || 5000;

const parseOrigins = (value?: string) =>
  (value || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_ORIGINS)
];
const localDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    const origins = process.env.NODE_ENV === 'production'
      ? allowedOrigins
      : Array.from(new Set([...allowedOrigins, ...localDevOrigins]));

    if (!origin || origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadsPath = ensureUploadDir();
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Bind routes
app.use('/api/auth', authRoutes);
app.use('/api/jerseys', jerseyRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Background Worker: Checks auction timings every 5 seconds
setInterval(() => {
  const now = new Date().toISOString();

  try {
    // 1. Check and open upcoming auctions
    const upcoming = db.prepare(`
      SELECT a.id, j.title
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE a.status = 'upcoming' AND a.start_time <= ?
    `).all(now) as any[];

    if (upcoming.length > 0) {
      const updateToLive = db.prepare("UPDATE auctions SET status = 'live' WHERE id = ?");
      upcoming.forEach(auction => {
        updateToLive.run(auction.id);
        console.log(`Auction "${auction.title}" is now LIVE!`);
        SseService.broadcast('auction_status', { auctionId: auction.id, status: 'live' });
      });
    }

    // 2. Check and close expired live auctions
    const expired = db.prepare(`
      SELECT a.id, a.jersey_id, a.start_price, a.current_price, j.title
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE a.status = 'live' AND a.end_time <= ?
    `).all(now) as any[];

    if (expired.length > 0) {
      const updateToClosed = db.prepare("UPDATE auctions SET status = 'closed', winner_user_id = ? WHERE id = ?");
      
      expired.forEach(auction => {
        // Find highest bid
        const highestBid = db.prepare(`
          SELECT user_id, bid_amount FROM bids
          WHERE auction_id = ?
          ORDER BY bid_amount DESC LIMIT 1
        `).get(auction.id) as any;

        if (highestBid) {
          // Declare winner
          updateToClosed.run(highestBid.user_id, auction.id);

          const winnerId = randomUUID();
          const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours deadline

          // Insert into auction_winners
          db.prepare(`
            INSERT INTO auction_winners (id, auction_id, user_id, final_price, status, payment_deadline)
            VALUES (?, ?, ?, ?, 'waiting_payment', ?)
          `).run(winnerId, auction.id, highestBid.user_id, highestBid.bid_amount, paymentDeadline);

          // Create notification for winner
          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type)
            VALUES (?, ?, ?, ?, 'winner')
          `).run(
            randomUUID(),
            highestBid.user_id,
            'Congratulations! You won the auction!',
            `You won the auction for "${auction.title}" with a bid of Rp ${highestBid.bid_amount.toLocaleString('id-ID')}. Please upload payment proof before deadline.`,
            'winner'
          );

          console.log(`Auction "${auction.title}" closed. Winner: ${highestBid.user_id}. Price: Rp ${highestBid.bid_amount}`);
          SseService.broadcast('auction_status', {
            auctionId: auction.id,
            status: 'closed',
            winnerUserId: highestBid.user_id,
            finalPrice: highestBid.bid_amount
          }, auction.id);
        } else {
          // Closed without bids
          updateToClosed.run(null, auction.id);
          console.log(`Auction "${auction.title}" closed with no bids.`);
          SseService.broadcast('auction_status', {
            auctionId: auction.id,
            status: 'closed',
            winnerUserId: null,
            finalPrice: 0
          }, auction.id);
        }
      });
    }
  } catch (err) {
    console.error('Background worker error:', err);
  }
}, 5000);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
