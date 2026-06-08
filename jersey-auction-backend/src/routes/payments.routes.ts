import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import db from '../config/db';
import { ensureUploadDir, toUploadUrl } from '../config/storage';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Setup Multer for upload proof
const uploadDir = ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `proof_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET all payments (Admin only, or current user)
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { role, id: userId } = req.user!;

  try {
    let query = `
      SELECT p.*, w.final_price, w.auction_id, j.title as jersey_title, u.full_name as user_name
      FROM payments p
      LEFT JOIN auction_winners w ON p.winner_id = w.id
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN users u ON p.user_id = u.id
    `;
    const params: any[] = [];

    if (role !== 'admin') {
      query += ' WHERE p.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY p.created_at DESC';

    const payments = db.prepare(query).all(...params);
    return res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ message: 'Error fetching payments' });
  }
});

// POST upload payment proof (Member only)
router.post('/upload-proof', authenticateToken, upload.single('proof'), (req: AuthRequest, res) => {
  const { winnerId, amount, address, recipientName, courier } = req.body;
  const userId = req.user!.id;

  if (!winnerId || !amount || !req.file) {
    return res.status(400).json({ message: 'Winner ID, amount, and proof file are required' });
  }

  try {
    // Validate winner is owner
    const winner = db.prepare('SELECT * FROM auction_winners WHERE id = ?').get(winnerId) as any;
    if (!winner) {
      return res.status(404).json({ message: 'Auction winner record not found' });
    }

    if (winner.user_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this winning record' });
    }

    // Check if payment already exists
    const existingPayment = db.prepare('SELECT id FROM payments WHERE winner_id = ?').get(winnerId) as any;
    const paymentId = existingPayment ? existingPayment.id : randomUUID();
    const proofUrl = toUploadUrl(req.file.filename);

    if (existingPayment) {
      // Update existing payment
      db.prepare(`
        UPDATE payments
        SET amount = ?, proof_image_url = ?, status = 'pending_verification', paid_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(amount, proofUrl, paymentId);
    } else {
      // Insert new payment
      db.prepare(`
        INSERT INTO payments (id, winner_id, user_id, amount, proof_image_url, status, paid_at)
        VALUES (?, ?, ?, ?, ?, 'pending_verification', datetime('now', 'localtime'))
      `).run(paymentId, winnerId, userId, amount, proofUrl);
    }

    // Update winner status
    db.prepare(`
      UPDATE auction_winners SET status = 'waiting_verification' WHERE id = ?
    `).run(winnerId);

    // Save temporary shipment details to win record or directly create pending shipment
    const existingShipment = db.prepare('SELECT id FROM shipments WHERE winner_id = ?').get(winnerId);
    if (!existingShipment) {
      db.prepare(`
        INSERT INTO shipments (id, winner_id, recipient_name, address, courier, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(randomUUID(), winnerId, recipientName || req.user!.email, address || 'No Address Provided', courier || 'Regular Courier');
    } else {
      db.prepare(`
        UPDATE shipments
        SET recipient_name = ?, address = ?, courier = ?
        WHERE winner_id = ?
      `).run(recipientName, address, courier, winnerId);
    }

    return res.json({ message: 'Payment proof uploaded successfully', paymentId });
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    return res.status(500).json({ message: 'Error uploading payment proof' });
  }
});

// PATCH verify payment (Admin only)
router.patch('/:id/verify', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'verified' or 'rejected'

  if (!status || !['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (verified or rejected) is required' });
  }

  try {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const nextWinnerStatus = status === 'verified' ? 'paid' : 'waiting_payment';

    // Update payment status
    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, id);

    // Update winner status
    db.prepare('UPDATE auction_winners SET status = ? WHERE id = ?').run(nextWinnerStatus, payment.winner_id);

    // Fetch jersey title for notification
    const detail = db.prepare(`
      SELECT j.title, w.user_id
      FROM auction_winners w
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE w.id = ?
    `).get(payment.winner_id) as any;

    // Send Notification
    const notifTitle = status === 'verified' ? 'Payment Verified!' : 'Payment Proof Rejected';
    const notifMsg = status === 'verified'
      ? `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} for "${detail.title}" has been verified. We are preparing your shipment.`
      : `Your payment proof for "${detail.title}" was rejected. Please check your transaction history and upload a valid receipt.`;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), detail.user_id, notifTitle, notifMsg, status);

    return res.json({ message: `Payment verified as ${status}`, winnerStatus: nextWinnerStatus });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ message: 'Error verifying payment' });
  }
});

export default router;
