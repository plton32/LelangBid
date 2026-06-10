import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../config/db';
import { ensureUploadDir, toUploadUrl, uploadDir } from '../config/storage';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Setup Multer for image uploads
ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const normalizeNumber = (value: any) => {
  if (value === undefined || value === null || value === '') return 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : NaN;
};

const normalizeDateValue = (value: any) => value ? String(value) : null;

const validateAuctionRequest = (
  payload: {
    auctionStartTime?: any;
    auctionEndTime?: any;
    auctionStartPrice?: any;
    reservePrice?: any;
  },
  requireAll: boolean
) => {
  const auctionStartTime = normalizeDateValue(payload.auctionStartTime);
  const auctionEndTime = normalizeDateValue(payload.auctionEndTime);
  const auctionStartPrice = normalizeNumber(payload.auctionStartPrice);
  const reservePrice = normalizeNumber(payload.reservePrice);

  if (requireAll && (!auctionStartTime || !auctionEndTime || !auctionStartPrice || !reservePrice)) {
    return {
      error: 'Auction start date, end date, start price, and final minimum price are required',
      values: null
    };
  }

  if ((auctionStartTime || auctionEndTime) && (!auctionStartTime || !auctionEndTime)) {
    return {
      error: 'Auction start date and end date must be filled together',
      values: null
    };
  }

  if (!Number.isFinite(auctionStartPrice) || auctionStartPrice < 0 || !Number.isFinite(reservePrice) || reservePrice < 0) {
    return {
      error: 'Auction prices must be valid positive numbers',
      values: null
    };
  }

  if (auctionStartTime && auctionEndTime) {
    const start = new Date(auctionStartTime);
    const end = new Date(auctionEndTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        error: 'Auction start date and end date must be valid dates',
        values: null
      };
    }

    if (end <= start) {
      return {
        error: 'Auction end date must be after the start date',
        values: null
      };
    }
  }

  if (reservePrice > 0 && auctionStartPrice > 0 && reservePrice < auctionStartPrice) {
    return {
      error: 'Final minimum price must be greater than or equal to the starting price',
      values: null
    };
  }

  return {
    error: null,
    values: {
      auctionStartTime,
      auctionEndTime,
      auctionStartPrice,
      reservePrice
    }
  };
};

// GET categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Error fetching categories' });
  }
});

// GET all jerseys (authenticated, or custom filters)
router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const { role, id: userId } = req.user!;
  const { status } = req.query;

  try {
    let query = `
      SELECT j.*, c.name as category_name, u.full_name as seller_name
      FROM jerseys j
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN users u ON j.seller_id = u.id
    `;
    const params: any[] = [];

    // Filter by seller ownership unless admin
    if (role === 'seller') {
      query += ' WHERE j.seller_id = ?';
      params.push(userId);
    } else if (role === 'member') {
      // Members only see verified jerseys
      query += " WHERE j.status = 'verified'";
    } else if (role === 'admin' && status) {
      query += ' WHERE j.status = ?';
      params.push(status);
    }

    const jerseys = db.prepare(query).all(...params) as any[];

    // Fetch images for each jersey
    const jerseysWithImages = jerseys.map(jersey => {
      const images = db.prepare('SELECT id, image_url, sort_order FROM jersey_images WHERE jersey_id = ? ORDER BY sort_order ASC').all(jersey.id);
      return {
        ...jersey,
        images
      };
    });

    return res.json(jerseysWithImages);
  } catch (error) {
    console.error('Error fetching jerseys:', error);
    return res.status(500).json({ message: 'Error fetching jerseys' });
  }
});

// GET single jersey
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const jersey = db.prepare(`
      SELECT j.*, c.name as category_name, u.full_name as seller_name
      FROM jerseys j
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN users u ON j.seller_id = u.id
      WHERE j.id = ?
    `).get(id) as any;

    if (!jersey) {
      return res.status(404).json({ message: 'Jersey not found' });
    }

    const images = db.prepare('SELECT id, image_url, sort_order FROM jersey_images WHERE jersey_id = ? ORDER BY sort_order ASC').all(id);
    const coa = db.prepare('SELECT * FROM certificates WHERE jersey_id = ?').get(id);

    return res.json({
      ...jersey,
      images,
      coa: coa || null
    });
  } catch (error) {
    console.error('Error fetching jersey details:', error);
    return res.status(500).json({ message: 'Error fetching jersey details' });
  }
});

// POST create jersey (seller or admin)
router.post('/', authenticateToken, requireRole(['seller', 'admin']), upload.array('images', 5), (req: AuthRequest, res) => {
  const {
    title,
    categoryId,
    playerName,
    clubName,
    leagueName,
    season,
    size,
    condition,
    jerseyType,
    isSigned,
    hasCoa,
    description,
    auctionStartTime,
    auctionEndTime,
    auctionStartPrice,
    reservePrice
  } = req.body;
  const sellerId = req.user!.id;

  if (!title || !categoryId) {
    return res.status(400).json({ message: 'Title and Category ID are required' });
  }

  const auctionRequest = validateAuctionRequest(
    { auctionStartTime, auctionEndTime, auctionStartPrice, reservePrice },
    req.user!.role === 'seller'
  );

  if (auctionRequest.error || !auctionRequest.values) {
    return res.status(400).json({ message: auctionRequest.error });
  }

  try {
    const jerseyId = randomUUID();
    const status = req.user!.role === 'admin' ? 'verified' : 'pending_verification';

    const insertJersey = db.prepare(`
      INSERT INTO jerseys (
        id, category_id, seller_id, title, player_name, club_name, league_name, season, size, condition,
        jersey_type, is_signed, has_coa, description, auction_start_time, auction_end_time,
        auction_start_price, reserve_price, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertJersey.run(
      jerseyId,
      categoryId,
      sellerId,
      title,
      playerName || null,
      clubName || null,
      leagueName || null,
      season || null,
      size || null,
      condition || null,
      jerseyType || null,
      isSigned === 'true' || isSigned === 1 ? 1 : 0,
      hasCoa === 'true' || hasCoa === 1 ? 1 : 0,
      description || null,
      auctionRequest.values.auctionStartTime,
      auctionRequest.values.auctionEndTime,
      auctionRequest.values.auctionStartPrice,
      auctionRequest.values.reservePrice,
      status
    );

    // Save uploaded image files
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const insertImg = db.prepare(`
        INSERT INTO jersey_images (id, jersey_id, image_url, sort_order) VALUES (?, ?, ?, ?)
      `);
      files.forEach((file, index) => {
        const imgUrl = toUploadUrl(file.filename);
        insertImg.run(randomUUID(), jerseyId, imgUrl, index);
      });
    }

    return res.status(201).json({
      message: 'Jersey listing submitted successfully',
      jerseyId,
      status
    });
  } catch (error) {
    console.error('Error creating jersey:', error);
    return res.status(500).json({ message: 'Error creating jersey listing' });
  }
});

// PUT update jersey status/details
router.put('/:id', authenticateToken, requireRole(['seller', 'admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const {
    title,
    categoryId,
    playerName,
    clubName,
    leagueName,
    season,
    size,
    condition,
    jerseyType,
    isSigned,
    hasCoa,
    description,
    status,
    auctionStartTime,
    auctionEndTime,
    auctionStartPrice,
    reservePrice
  } = req.body;
  const { role, id: userId } = req.user!;

  try {
    // Check ownership
    const existing = db.prepare('SELECT * FROM jerseys WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ message: 'Jersey not found' });
    }

    if (role !== 'admin' && existing.seller_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this jersey listing' });
    }

    const auctionRequest = validateAuctionRequest(
      {
        auctionStartTime: auctionStartTime ?? existing.auction_start_time,
        auctionEndTime: auctionEndTime ?? existing.auction_end_time,
        auctionStartPrice: auctionStartPrice ?? existing.auction_start_price,
        reservePrice: reservePrice ?? existing.reserve_price
      },
      false
    );

    if (auctionRequest.error || !auctionRequest.values) {
      return res.status(400).json({ message: auctionRequest.error });
    }

    // Admins can change status, sellers cannot change status once submitted for verification
    let nextStatus = existing.status;
    if (role === 'admin' && status) {
      nextStatus = status;
    } else if (role === 'seller' && existing.status === 'draft') {
      nextStatus = 'pending_verification';
    }

    const updateQuery = `
      UPDATE jerseys
      SET title = ?, category_id = ?, player_name = ?, club_name = ?, league_name = ?, season = ?, size = ?, condition = ?,
          jersey_type = ?, is_signed = ?, has_coa = ?, description = ?, auction_start_time = ?, auction_end_time = ?,
          auction_start_price = ?, reserve_price = ?, status = ?
      WHERE id = ?
    `;

    db.prepare(updateQuery).run(
      title || null,
      categoryId || null,
      playerName || null,
      clubName || null,
      leagueName || null,
      season || null,
      size || null,
      condition || null,
      jerseyType || null,
      isSigned === 'true' || isSigned === 1 ? 1 : 0,
      hasCoa === 'true' || hasCoa === 1 ? 1 : 0,
      description || null,
      auctionRequest.values.auctionStartTime,
      auctionRequest.values.auctionEndTime,
      auctionRequest.values.auctionStartPrice,
      auctionRequest.values.reservePrice,
      nextStatus,
      id
    );

    return res.json({ message: 'Jersey listing updated successfully', status: nextStatus });
  } catch (error) {
    console.error('Error updating jersey:', error);
    return res.status(500).json({ message: 'Error updating jersey listing' });
  }
});

// DELETE jersey
router.delete('/:id', authenticateToken, requireRole(['seller', 'admin']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user!;

  try {
    const existing = db.prepare('SELECT seller_id FROM jerseys WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ message: 'Jersey not found' });
    }

    if (role !== 'admin' && existing.seller_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this jersey listing' });
    }

    // Delete image files from disk first
    const images = db.prepare('SELECT image_url FROM jersey_images WHERE jersey_id = ?').all(id) as any[];
    images.forEach(img => {
      const filePath = path.join(uploadDir, path.basename(img.image_url));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    });

    db.prepare('DELETE FROM jerseys WHERE id = ?').run(id);

    return res.json({ message: 'Jersey listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting jersey:', error);
    return res.status(500).json({ message: 'Error deleting jersey listing' });
  }
});

export default router;
