import { Router } from 'express';
import db from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET notifications
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const list = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    return res.json(list);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// PATCH mark as read
router.patch('/:id/read', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const notif = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(id) as any;
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notif.user_id !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// GET users winning list
router.get('/winnings', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const list = db.prepare(`
      SELECT w.*, j.title as jersey_title, j.id as jersey_id, a.id as auction_id,
             (SELECT image_url FROM jersey_images WHERE jersey_id = j.id ORDER BY sort_order ASC LIMIT 1) as main_image,
             s.courier, s.tracking_number, s.status as shipment_status
      FROM auction_winners w
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN shipments s ON w.id = s.winner_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(userId);
    return res.json(list);
  } catch (error) {
    console.error('Error fetching winnings:', error);
    return res.status(500).json({ message: 'Error fetching winnings' });
  }
});

export default router;
