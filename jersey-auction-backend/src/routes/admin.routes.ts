import { Router } from 'express';
import db from '../config/db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { randomUUID } from 'node:crypto';

const router = Router();

// Protect all admin endpoints with admin role
router.use(authenticateToken, requireRole(['admin']));

// GET statistics
router.get('/stats', (req, res) => {
  try {
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const totalJerseys = (db.prepare('SELECT COUNT(*) as count FROM jerseys').get() as any).count;
    const activeAuctions = (db.prepare("SELECT COUNT(*) as count FROM auctions WHERE status = 'live'").get() as any).count;
    const closedAuctions = (db.prepare("SELECT COUNT(*) as count FROM auctions WHERE status = 'closed'").get() as any).count;
    
    const totalRevenue = (db.prepare("SELECT SUM(final_price) as sum FROM auction_winners WHERE status = 'completed'").get() as any).sum || 0;
    const pendingPayments = (db.prepare("SELECT COUNT(*) as count FROM auction_winners WHERE status = 'waiting_payment'").get() as any).count;
    const pendingShipments = (db.prepare("SELECT COUNT(*) as count FROM shipments WHERE status = 'pending'").get() as any).count;
    const pendingSellerApplications = (db.prepare("SELECT COUNT(*) as count FROM seller_applications WHERE status = 'pending'").get() as any).count;

    return res.json({
      totalUsers,
      totalJerseys,
      activeAuctions,
      closedAuctions,
      totalRevenue,
      pendingPayments,
      pendingShipments,
      pendingSellerApplications
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ message: 'Error fetching stats' });
  }
});

// GET users listing
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, full_name, email, phone, role, status, deposit_balance, created_at FROM users').all();
    return res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});

// GET seller upgrade applications
router.get('/seller-applications', (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT sa.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone, u.role as current_role
      FROM seller_applications sa
      LEFT JOIN users u ON sa.user_id = u.id
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE sa.status = ?';
      params.push(status);
    }

    query += `
      ORDER BY
        CASE sa.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        sa.created_at DESC
    `;

    const applications = db.prepare(query).all(...params);
    return res.json(applications);
  } catch (error) {
    console.error('Error fetching seller applications:', error);
    return res.status(500).json({ message: 'Error fetching seller applications' });
  }
});

// PATCH approve/reject seller upgrade application
router.patch('/seller-applications/:id/verify', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body;
  const adminId = req.user!.id;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (approved or rejected) is required' });
  }

  try {
    const application = db.prepare(`
      SELECT sa.*, u.full_name, u.email, u.role
      FROM seller_applications sa
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE sa.id = ?
    `).get(id) as any;

    if (!application) {
      return res.status(404).json({ message: 'Seller application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: `Seller application is already ${application.status}` });
    }

    db.prepare(`
      UPDATE seller_applications
      SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, adminNote || null, adminId, id);

    if (status === 'approved') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('seller', application.user_id);
    }

    const notifTitle = status === 'approved' ? 'Seller Application Approved' : 'Seller Application Rejected';
    const notifMsg = status === 'approved'
      ? 'Your account has been upgraded to seller. You can now access Seller Center.'
      : `Your seller application was rejected.${adminNote ? ` Note: ${adminNote}` : ''}`;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), application.user_id, notifTitle, notifMsg, 'seller_application');

    return res.json({
      message: `Seller application ${status}`,
      status
    });
  } catch (error) {
    console.error('Error verifying seller application:', error);
    return res.status(500).json({ message: 'Error verifying seller application' });
  }
});

// PATCH change user status/role
router.patch('/users/:id', (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    }
    if (status) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    }

    return res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ message: 'Error updating user' });
  }
});

// PATCH verify/approve seller jersey listing
router.patch('/jerseys/:id/verify', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'verified' or 'rejected'

  if (!status || !['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const jersey = db.prepare('SELECT * FROM jerseys WHERE id = ?').get(id) as any;
    if (!jersey) {
      return res.status(404).json({ message: 'Jersey not found' });
    }

    db.prepare('UPDATE jerseys SET status = ? WHERE id = ?').run(status, id);

    // Send Notification to Seller
    const notifTitle = status === 'verified' ? 'Jersey Approved' : 'Jersey Listing Rejected';
    const notifMsg = status === 'verified'
      ? `Your jersey listing "${jersey.title}" has been verified and is ready for auction.`
      : `Your jersey listing "${jersey.title}" was rejected for verification.`;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, 'jersey_verify')
    `).run(randomUUID(), jersey.seller_id, notifTitle, notifMsg);

    return res.json({ message: `Jersey listing marked as ${status}` });
  } catch (error) {
    console.error('Error verifying jersey:', error);
    return res.status(500).json({ message: 'Error verifying jersey' });
  }
});

// GET CSV reports of sales
router.get('/reports/csv', (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT w.id as winner_id, j.title as jersey_title, u_winner.full_name as winner_name,
             u_seller.full_name as seller_name, w.final_price, w.status as transaction_status, w.created_at
      FROM auction_winners w
      LEFT JOIN auctions a ON w.auction_id = a.id
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN users u_winner ON w.user_id = u_winner.id
      LEFT JOIN users u_seller ON j.seller_id = u_seller.id
      ORDER BY w.created_at DESC
    `).all() as any[];

    // Build CSV string
    const headers = ['Transaction ID', 'Jersey Title', 'Winner Name', 'Seller Name', 'Final Price', 'Status', 'Date'];
    const rows = reports.map(r => [
      r.winner_id,
      `"${r.jersey_title.replace(/"/g, '""')}"`,
      r.winner_name,
      r.seller_name,
      r.final_price,
      r.transaction_status,
      r.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
    return res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV report:', error);
    return res.status(500).json({ message: 'Error generating report' });
  }
});

export default router;
