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
import { processAuctionStatusTransitions } from './services/auctionLifecycle.service';

// Import routes
import authRoutes from './routes/auth.routes';
import jerseyRoutes from './routes/jerseys.routes';
import auctionRoutes from './routes/auctions.routes';
import paymentRoutes from './routes/payments.routes';
import depositRoutes from './routes/deposits.routes';
import shipmentRoutes from './routes/shipments.routes';
import certificateRoutes from './routes/certificates.routes';
import notificationRoutes from './routes/notifications.routes';
import sellerApplicationRoutes from './routes/sellerApplications.routes';
import adminRoutes from './routes/admin.routes';
import { BID_DEPOSIT_REQUIRED, DEPOSIT_FORFEIT_RATE, DEPOSIT_REFUND_RATE } from './utils/deposit';

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
app.use('/api/deposits', depositRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/seller-applications', sellerApplicationRoutes);
app.use('/api/admin', adminRoutes);

// Background Worker: Checks auction timings every 5 seconds
setInterval(() => {
  const now = new Date().toISOString();

  try {
    processAuctionStatusTransitions(now);

    // Cancel unpaid winners after deadline and forfeit 30% of the bid deposit
    const overdueWinners = db.prepare(`
      SELECT w.id, w.user_id, w.final_price, w.payment_deadline, j.title, u.deposit_balance
      FROM auction_winners w
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.status = 'waiting_payment'
        AND w.payment_deadline IS NOT NULL
        AND w.payment_deadline <= ?
    `).all(now) as any[];

    if (overdueWinners.length > 0) {
      const updateWinnerToCancelled = db.prepare("UPDATE auction_winners SET status = 'cancelled' WHERE id = ?");
      const deductDeposit = db.prepare(`
        UPDATE users
        SET deposit_balance = CASE
          WHEN COALESCE(deposit_balance, 0) < ? THEN 0
          ELSE COALESCE(deposit_balance, 0) - ?
        END
        WHERE id = ?
      `);

      overdueWinners.forEach(winner => {
        const currentDeposit = Number(winner.deposit_balance || 0);
        const forfeitAmount = Math.min(currentDeposit, Math.ceil(BID_DEPOSIT_REQUIRED * DEPOSIT_FORFEIT_RATE));
        const refundAmount = Math.max(0, BID_DEPOSIT_REQUIRED - forfeitAmount);

        updateWinnerToCancelled.run(winner.id);
        if (forfeitAmount > 0) {
          deductDeposit.run(forfeitAmount, forfeitAmount, winner.user_id);
        }

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          winner.user_id,
          'Auction Payment Deadline Missed',
          `Your winning bid for "${winner.title}" was cancelled because payment was not completed. Rp ${forfeitAmount.toLocaleString('id-ID')} of the security deposit was forfeited; around ${(DEPOSIT_REFUND_RATE * 100).toFixed(0)}% remains refundable/active.`,
          'deposit_forfeit'
        );

        console.log(`Winner ${winner.id} cancelled. Forfeited Rp ${forfeitAmount}. Remaining/refund baseline: Rp ${refundAmount}.`);
      });
    }
  } catch (err) {
    console.error('Background worker error:', err);
  }
}, 5000);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
