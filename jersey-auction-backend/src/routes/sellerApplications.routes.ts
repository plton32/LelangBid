import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// GET current user's latest seller application
router.get('/me', (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
    const application = db.prepare(`
      SELECT *
      FROM seller_applications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);

    return res.json({
      currentRole: user?.role || req.user!.role,
      application: application || null
    });
  } catch (error) {
    console.error('Error fetching seller application:', error);
    return res.status(500).json({ message: 'Error fetching seller application' });
  }
});

// POST submit seller upgrade application
router.post('/', (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { storeName, reason } = req.body;

  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'seller' || user.role === 'admin') {
      return res.status(400).json({ message: 'This account already has seller access' });
    }

    const pending = db.prepare(`
      SELECT id FROM seller_applications
      WHERE user_id = ? AND status = 'pending'
    `).get(userId);

    if (pending) {
      return res.status(400).json({ message: 'Your seller application is already waiting for admin approval' });
    }

    const applicationId = randomUUID();
    db.prepare(`
      INSERT INTO seller_applications (id, user_id, store_name, reason, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(applicationId, userId, storeName || null, reason || null);

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      userId,
      'Seller Application Submitted',
      'Your seller application is waiting for admin approval.',
      'seller_application'
    );

    return res.status(201).json({
      message: 'Seller application submitted. Waiting for admin approval.',
      applicationId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error submitting seller application:', error);
    return res.status(500).json({ message: 'Error submitting seller application' });
  }
});

export default router;
