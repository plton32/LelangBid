import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET shipments (Admin/Seller/Member filtered)
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { role, id: userId } = req.user!;

  try {
    let query = `
      SELECT s.*, w.final_price, a.start_price, a.start_time, a.end_time,
             j.title as jersey_title, j.seller_id, u.full_name as winner_name
      FROM shipments s
      LEFT JOIN auction_winners w ON s.winner_id = w.id
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN users u ON w.user_id = u.id
    `;
    const params: any[] = [];

    if (role === 'member') {
      query += ' WHERE w.user_id = ?';
      params.push(userId);
    } else if (role === 'seller') {
      query += ' WHERE j.seller_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY s.created_at DESC';

    const shipments = db.prepare(query).all(...params);
    return res.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return res.status(500).json({ message: 'Error fetching shipments' });
  }
});

// PATCH update tracking resi / status
router.patch('/:id', authenticateToken, requireRole(['admin', 'seller']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { courier, trackingNumber, status } = req.body; // status: 'pending', 'shipped', 'delivered'

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    // Check shipment
    const shipment = db.prepare(`
      SELECT s.*, w.user_id as winner_user_id, j.title as jersey_title, j.seller_id
      FROM shipments s
      LEFT JOIN auction_winners w ON s.winner_id = w.id
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment record not found' });
    }

    // Guard: seller can only update tracking for their own sold items
    if (req.user!.role === 'seller' && shipment.seller_id !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden: This is not your sold jersey' });
    }

    // Update shipment
    db.prepare(`
      UPDATE shipments
      SET courier = ?, tracking_number = ?, status = ?
      WHERE id = ?
    `).run(courier || shipment.courier, trackingNumber || shipment.tracking_number, status, id);

    // Update auction winner status accordingly
    let nextWinnerStatus = 'paid';
    if (status === 'shipped') {
      nextWinnerStatus = 'shipped';
    } else if (status === 'delivered') {
      nextWinnerStatus = 'completed';
    }
    db.prepare('UPDATE auction_winners SET status = ? WHERE id = ?').run(nextWinnerStatus, shipment.winner_id);

    // Create notifications for winner
    let notifTitle = 'Shipment Status Update';
    let notifMsg = `Your package status for "${shipment.jersey_title}" is now: ${status}.`;

    if (status === 'shipped') {
      notifTitle = 'Your Jersey Has Been Shipped!';
      notifMsg = `Your jersey "${shipment.jersey_title}" was shipped via ${courier || shipment.courier}. Resi tracking number: ${trackingNumber}.`;
    } else if (status === 'delivered') {
      notifTitle = 'Jersey Delivered!';
      notifMsg = `Your jersey "${shipment.jersey_title}" has been successfully delivered. Thank you for bidding!`;
    }

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, 'shipment')
    `).run(randomUUID(), shipment.winner_user_id, notifTitle, notifMsg);

    return res.json({ message: 'Shipment updated successfully', status, trackingNumber });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return res.status(500).json({ message: 'Error updating shipment' });
  }
});

export default router;
