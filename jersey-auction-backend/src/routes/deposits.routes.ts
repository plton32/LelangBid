import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import db from '../config/db';
import { ensureUploadDir, toUploadUrl } from '../config/storage';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { BID_DEPOSIT_REQUIRED, DEPOSIT_REQUEST_MINIMUM, getDepositPolicy } from '../utils/deposit';
import { syncUserDepositBalance } from '../utils/depositBalance';

const router = Router();
const uploadDir = ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `deposit_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const getActiveBankAccount = () => db.prepare(`
  SELECT id, bank_name, account_number, account_holder_name, instructions, updated_at
  FROM deposit_bank_accounts
  WHERE is_active = 1
  ORDER BY updated_at DESC
  LIMIT 1
`).get();

router.get('/bank-account', authenticateToken, (req, res) => {
  try {
    return res.json({ bankAccount: getActiveBankAccount() || null });
  } catch (error) {
    console.error('Error fetching deposit bank account:', error);
    return res.status(500).json({ message: 'Error fetching deposit bank account' });
  }
});

router.patch('/bank-account', authenticateToken, requireRole(['admin']), (req, res) => {
  const { bankName, accountNumber, accountHolderName, instructions } = req.body;

  if (!bankName || !accountNumber || !accountHolderName) {
    return res.status(400).json({ message: 'Bank name, account number, and account holder name are required' });
  }

  try {
    db.prepare(`
      INSERT INTO deposit_bank_accounts (id, bank_name, account_number, account_holder_name, instructions, is_active, updated_at)
      VALUES ('primary', ?, ?, ?, ?, 1, datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE SET
        bank_name = excluded.bank_name,
        account_number = excluded.account_number,
        account_holder_name = excluded.account_holder_name,
        instructions = excluded.instructions,
        is_active = 1,
        updated_at = datetime('now', 'localtime')
    `).run(bankName, accountNumber, accountHolderName, instructions || null);

    return res.json({ message: 'Deposit bank account updated successfully', bankAccount: getActiveBankAccount() });
  } catch (error) {
    console.error('Error updating deposit bank account:', error);
    return res.status(500).json({ message: 'Error updating deposit bank account' });
  }
});

router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const depositBalance = syncUserDepositBalance(userId);

    const transactions = db.prepare(`
      SELECT id, amount, status, method, proof_image_url, admin_note, verified_at, created_at
      FROM deposits
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(userId);

    return res.json({
      depositBalance,
      bankAccount: getActiveBankAccount() || null,
      ...getDepositPolicy(),
      transactions
    });
  } catch (error) {
    console.error('Error fetching deposit balance:', error);
    return res.status(500).json({ message: 'Error fetching deposit balance' });
  }
});

router.post('/request', authenticateToken, upload.single('proof'), (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const amount = Number(req.body.amount);

  if (!req.file) {
    return res.status(400).json({ message: 'Deposit transfer proof image is required' });
  }

  if (!Number.isFinite(amount) || amount < DEPOSIT_REQUEST_MINIMUM) {
    return res.status(400).json({
      message: `Minimum deposit request is Rp ${DEPOSIT_REQUEST_MINIMUM.toLocaleString('id-ID')}`
    });
  }

  try {
    const bankAccount = getActiveBankAccount();
    if (!bankAccount) {
      return res.status(400).json({ message: 'Deposit bank account has not been configured by admin' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const depositBalance = syncUserDepositBalance(userId);
    const requiredShortfall = Math.max(0, BID_DEPOSIT_REQUIRED - depositBalance);
    if (requiredShortfall === 0) {
      return res.status(400).json({ message: 'Your bidding deposit is already active' });
    }

    if (amount < requiredShortfall) {
      return res.status(400).json({
        message: `Deposit request must be at least Rp ${requiredShortfall.toLocaleString('id-ID')} to activate bidding`
      });
    }

    const pendingDeposit = db.prepare(`
      SELECT id FROM deposits
      WHERE user_id = ? AND status = 'pending_verification'
      LIMIT 1
    `).get(userId);

    if (pendingDeposit) {
      return res.status(400).json({ message: 'You already have a deposit request waiting for admin verification' });
    }

    const depositId = randomUUID();
    const proofUrl = toUploadUrl(req.file.filename);

    db.prepare(`
      INSERT INTO deposits (id, user_id, amount, status, method, proof_image_url)
      VALUES (?, ?, ?, 'pending_verification', 'bank_transfer', ?)
    `).run(depositId, userId, amount, proofUrl);

    return res.status(201).json({
      message: 'Deposit request submitted. Waiting for admin verification.',
      depositId,
      status: 'pending_verification',
      ...getDepositPolicy()
    });
  } catch (error) {
    console.error('Error creating deposit request:', error);
    return res.status(500).json({ message: 'Error creating deposit request' });
  }
});

router.get('/admin/requests', authenticateToken, requireRole(['admin']), (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT d.*, u.full_name as user_name, u.email as user_email, u.deposit_balance
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC LIMIT 100';

    const requests = (db.prepare(query).all(...params) as any[]).map(request => ({
      ...request,
      deposit_balance: syncUserDepositBalance(request.user_id)
    }));
    return res.json(requests);
  } catch (error) {
    console.error('Error fetching deposit requests:', error);
    return res.status(500).json({ message: 'Error fetching deposit requests' });
  }
});

router.patch('/admin/requests/:id/verify', authenticateToken, requireRole(['admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, adminNote, verifiedAmount } = req.body;
  const adminId = req.user!.id;

  if (!status || !['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (verified or rejected) is required' });
  }

  try {
    const deposit = db.prepare(`
      SELECT d.*, u.full_name as user_name
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `).get(id) as any;

    if (!deposit) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (deposit.status !== 'pending_verification') {
      return res.status(400).json({ message: `Deposit request is already ${deposit.status}` });
    }

    const amountToCredit = Number(verifiedAmount || deposit.amount);
    if (status === 'verified' && (!Number.isFinite(amountToCredit) || amountToCredit <= 0)) {
      return res.status(400).json({ message: 'Verified deposit amount must be valid' });
    }

    db.exec('BEGIN');

    try {
      if (status === 'verified') {
        db.prepare(`
          UPDATE deposits
          SET status = 'verified', amount = ?, admin_note = ?, verified_by = ?, verified_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(amountToCredit, adminNote || null, adminId, id);

        db.prepare(`
          UPDATE users
          SET deposit_balance = COALESCE(deposit_balance, 0) + ?
          WHERE id = ?
        `).run(amountToCredit, deposit.user_id);
      } else {
        db.prepare(`
          UPDATE deposits
          SET status = 'rejected', admin_note = ?, verified_by = ?, verified_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(adminNote || null, adminId, id);
      }

      const notifTitle = status === 'verified' ? 'Deposit Verified' : 'Deposit Rejected';
      const notifMsg = status === 'verified'
        ? `Your security deposit of Rp ${amountToCredit.toLocaleString('id-ID')} has been verified. You can now place bids.`
        : 'Your deposit transfer could not be verified. Please submit a valid transfer proof.';

      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), deposit.user_id, notifTitle, notifMsg, status === 'verified' ? 'deposit' : 'deposit_rejected');

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const depositBalance = syncUserDepositBalance(deposit.user_id);

    return res.json({
      message: `Deposit request marked as ${status}`,
      status,
      depositBalance
    });
  } catch (error) {
    console.error('Error verifying deposit request:', error);
    return res.status(500).json({ message: 'Error verifying deposit request' });
  }
});

export default router;
