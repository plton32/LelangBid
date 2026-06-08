import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { SseService } from '../services/sse.service';

const router = Router();

// SSE subscription endpoint
router.get('/:id/sse', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = randomUUID();
  SseService.addClient(clientId, res, id);

  req.on('close', () => {
    SseService.removeClient(clientId);
  });
});

// GET all auctions
router.get('/', (req, res) => {
  const { status, categorySlug } = req.query;

  try {
    let query = `
      SELECT a.*, j.title as jersey_title, j.condition, j.size, j.is_signed, j.has_coa,
             c.name as category_name, c.slug as category_slug,
             (SELECT image_url FROM jersey_images WHERE jersey_id = j.id ORDER BY sort_order ASC LIMIT 1) as main_image
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN categories c ON j.category_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (categorySlug) {
      conditions.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.end_time ASC';

    const auctions = db.prepare(query).all(...params);
    return res.json(auctions);
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return res.status(500).json({ message: 'Error fetching auctions' });
  }
});

// GET single auction detail
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const auction = db.prepare(`
      SELECT a.*, j.title as jersey_title, j.player_name, j.club_name, j.league_name,
             j.season, j.size, j.condition, j.jersey_type, j.is_signed, j.has_coa, j.description, j.seller_id,
             c.name as category_name, u.full_name as seller_name
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN users u ON j.seller_id = u.id
      WHERE a.id = ?
    `).get(id) as any;

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Get all images
    const images = db.prepare('SELECT id, image_url FROM jersey_images WHERE jersey_id = ? ORDER BY sort_order ASC').all(auction.jersey_id);
    
    // Get bid history (newest first)
    const bids = db.prepare(`
      SELECT b.*, u.full_name as user_name
      FROM bids b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.auction_id = ?
      ORDER BY b.bid_amount DESC, b.created_at DESC
    `).all(id);

    // Get active certificate if this memorabilia has COA
    const coa = db.prepare(`
      SELECT *
      FROM certificates
      WHERE jersey_id = ? AND status = 'valid'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(auction.jersey_id);

    return res.json({
      ...auction,
      images,
      bids,
      coa: coa || null
    });
  } catch (error) {
    console.error('Error fetching auction details:', error);
    return res.status(500).json({ message: 'Error fetching auction details' });
  }
});

// POST create auction (admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { jerseyId, startPrice, minIncrement, startTime, endTime } = req.body;

  if (!jerseyId || !startPrice || !startTime || !endTime) {
    return res.status(400).json({ message: 'Jersey ID, start price, start time, and end time are required' });
  }

  try {
    // Validate jersey is verified and not already in an active auction
    const jersey = db.prepare('SELECT status FROM jerseys WHERE id = ?').get(jerseyId) as any;
    if (!jersey) {
      return res.status(404).json({ message: 'Jersey not found' });
    }
    if (jersey.status !== 'verified') {
      return res.status(400).json({ message: 'Only verified jerseys can be auctioned' });
    }

    const activeAuction = db.prepare(`
      SELECT id FROM auctions WHERE jersey_id = ? AND status IN ('upcoming', 'live')
    `).get(jerseyId);

    if (activeAuction) {
      return res.status(400).json({ message: 'This jersey is already in an active or upcoming auction' });
    }

    const auctionId = randomUUID();
    const now = new Date();
    const start = new Date(startTime);
    let initialStatus = 'upcoming';

    if (start <= now) {
      initialStatus = 'live';
    }

    db.prepare(`
      INSERT INTO auctions (id, jersey_id, start_price, current_price, min_increment, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auctionId,
      jerseyId,
      startPrice,
      startPrice, // current_price initially equal to start_price
      minIncrement || 50000,
      startTime,
      endTime,
      initialStatus
    );

    return res.status(201).json({ message: 'Auction created successfully', auctionId, status: initialStatus });
  } catch (error) {
    console.error('Error creating auction:', error);
    return res.status(500).json({ message: 'Error creating auction' });
  }
});

// POST bid (member or seller - except self bidding)
router.post('/:id/bid', authenticateToken, requireRole(['member', 'seller', 'admin']), (req: AuthRequest, res) => {
  const { id: auctionId } = req.params;
  const { bidAmount } = req.body;
  const userId = req.user!.id;

  if (!bidAmount) {
    return res.status(400).json({ message: 'Bid amount is required' });
  }

  try {
    // Transaction query to get auction state
    const auction = db.prepare(`
      SELECT a.*, j.seller_id, j.title as jersey_title
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE a.id = ?
    `).get(auctionId) as any;

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check status
    if (auction.status !== 'live') {
      return res.status(400).json({ message: `Bids are only allowed on live auctions. Status is: ${auction.status}` });
    }

    // Check self-bidding
    if (auction.seller_id === userId) {
      return res.status(400).json({ message: 'You cannot bid on your own jersey auction' });
    }

    // Validate times
    const nowTime = new Date().getTime();
    const startTime = new Date(auction.start_time).getTime();
    const endTime = new Date(auction.end_time).getTime();

    if (nowTime < startTime || nowTime > endTime) {
      return res.status(400).json({ message: 'Auction is not active' });
    }

    // Validate price increment
    const bidsCount = (db.prepare('SELECT COUNT(*) as count FROM bids WHERE auction_id = ?').get(auctionId) as any).count;
    let minAllowed = auction.start_price;

    if (bidsCount > 0) {
      minAllowed = auction.current_price + auction.min_increment;
    }

    if (bidAmount < minAllowed) {
      return res.status(400).json({ message: `Bid amount must be at least Rp ${minAllowed.toLocaleString('id-ID')}` });
    }

    // Insert bid
    const bidId = randomUUID();
    db.prepare(`
      INSERT INTO bids (id, auction_id, user_id, bid_amount) VALUES (?, ?, ?, ?)
    `).run(bidId, auctionId, userId, bidAmount);

    // Update auction current price
    db.prepare(`
      UPDATE auctions SET current_price = ? WHERE id = ?
    `).run(bidAmount, auctionId);

    // Anti-Sniper Check (last 2 minutes extension)
    let finalEndTime = auction.end_time;
    const remainingTimeMs = endTime - nowTime;
    const twoMinutesMs = 2 * 60 * 1000;
    let sniperExtended = false;

    if (remainingTimeMs < twoMinutesMs) {
      // Extend end_time by 2 minutes from current end_time
      const newEnd = new Date(endTime + twoMinutesMs);
      finalEndTime = newEnd.toISOString();
      
      db.prepare(`
        UPDATE auctions SET end_time = ? WHERE id = ?
      `).run(finalEndTime, auctionId);
      sniperExtended = true;
    }

    // Insert notification for previous highest bidder
    if (bidsCount > 0) {
      const prevBidder = db.prepare(`
        SELECT user_id FROM bids WHERE auction_id = ? AND user_id != ? ORDER BY bid_amount DESC LIMIT 1
      `).get(auctionId, userId) as any;

      if (prevBidder) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type)
          VALUES (?, ?, ?, ?, 'outbid')
        `).run(
          randomUUID(),
          prevBidder.user_id,
          'You have been outbid!',
          `Someone placed a higher bid of Rp ${bidAmount.toLocaleString('id-ID')} on "${auction.jersey_title}". Place another bid now!`,
          'outbid'
        );
      }
    }

    // Fetch updated bid history to broadcast
    const updatedBids = db.prepare(`
      SELECT b.*, u.full_name as user_name
      FROM bids b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.auction_id = ?
      ORDER BY b.bid_amount DESC, b.created_at DESC
      LIMIT 10
    `).all(auctionId);

    // Broadcast update via SSE
    SseService.broadcast('new_bid', {
      auctionId,
      currentPrice: bidAmount,
      endTime: finalEndTime,
      extended: sniperExtended,
      bids: updatedBids
    }, auctionId);

    return res.status(201).json({
      message: 'Bid placed successfully',
      bidId,
      currentPrice: bidAmount,
      endTime: finalEndTime,
      extended: sniperExtended
    });
  } catch (error) {
    console.error('Error processing bid:', error);
    return res.status(500).json({ message: 'Error processing bid' });
  }
});

export default router;
