import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET all certificates (Admin or verifier)
router.get('/', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const list = db.prepare(`
      SELECT cert.*, j.title as jersey_title, u.full_name as seller_name
      FROM certificates cert
      LEFT JOIN jerseys j ON cert.jersey_id = j.id
      LEFT JOIN users u ON j.seller_id = u.id
      ORDER BY cert.created_at DESC
    `).all();
    return res.json(list);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return res.status(500).json({ message: 'Error fetching certificates' });
  }
});

// GET public COA verification details
router.get('/verify/:coaNumber', (req, res) => {
  const { coaNumber } = req.params;

  try {
    const cert = db.prepare(`
      SELECT cert.*, j.title, j.player_name, j.club_name, j.league_name, j.season, j.size, j.condition, j.jersey_type, j.is_signed, j.description,
             (SELECT image_url FROM jersey_images WHERE jersey_id = j.id ORDER BY sort_order ASC LIMIT 1) as main_image
      FROM certificates cert
      LEFT JOIN jerseys j ON cert.jersey_id = j.id
      WHERE cert.coa_number = ?
    `).get(coaNumber) as any;

    if (!cert) {
      return res.status(404).json({ message: 'Certificate of Authenticity not found' });
    }

    return res.json(cert);
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return res.status(500).json({ message: 'Error verifying certificate' });
  }
});

// POST create certificate (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { jerseyId, verifierName, coaNumber } = req.body;

  if (!jerseyId || !verifierName) {
    return res.status(400).json({ message: 'Jersey ID and Verifier Name are required' });
  }

  try {
    // Check if certificate already exists for the jersey
    const existing = db.prepare('SELECT id, coa_number FROM certificates WHERE jersey_id = ?').get(jerseyId) as any;
    if (existing) {
      return res.status(400).json({ message: `A certificate already exists for this jersey (COA Number: ${existing.coa_number})` });
    }

    // Generate unique COA number if not provided
    const targetCoaNumber = coaNumber || `COA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || '').split(',')[0].trim();
    const qrCodeUrl = publicAppUrl
      ? `${publicAppUrl.replace(/\/$/, '')}/verify/${targetCoaNumber}`
      : `/verify/${targetCoaNumber}`;

    const certId = randomUUID();
    db.prepare(`
      INSERT INTO certificates (id, jersey_id, coa_number, qr_code_url, verifier_name, status)
      VALUES (?, ?, ?, ?, ?, 'valid')
    `).run(certId, jerseyId, targetCoaNumber, qrCodeUrl, verifierName);

    // Update jersey state has_coa to true
    db.prepare('UPDATE jerseys SET has_coa = 1 WHERE id = ?').run(jerseyId);

    return res.status(201).json({
      message: 'Certificate of Authenticity created successfully',
      certificateId: certId,
      coaNumber: targetCoaNumber,
      qrCodeUrl
    });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return res.status(500).json({ message: 'Error creating certificate' });
  }
});

// PATCH change certificate status (Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'valid', 'revoked', 'pending'

  if (!status || !['valid', 'revoked', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const cert = db.prepare('SELECT id FROM certificates WHERE id = ?').get(id);
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    db.prepare('UPDATE certificates SET status = ? WHERE id = ?').run(status, id);
    return res.json({ message: `Certificate status updated to ${status}` });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    return res.status(500).json({ message: 'Error updating certificate status' });
  }
});

export default router;
