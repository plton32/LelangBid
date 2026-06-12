import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { SseService } from '../services/sse.service';
import { processAuctionStatusTransitions } from '../services/auctionLifecycle.service';
import { calculateBidDepositRequirement, getDepositPolicy } from '../utils/deposit';

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
    processAuctionStatusTransitions();

    let query = `
      SELECT a.*, w.final_price,
             j.title as jersey_title, j.condition, j.size, j.is_signed, j.has_coa, j.seller_id,
             c.name as category_name, c.slug as category_slug,
             (SELECT image_url FROM jersey_images WHERE jersey_id = j.id ORDER BY sort_order ASC LIMIT 1) as main_image
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN auction_winners w ON w.auction_id = a.id
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
    processAuctionStatusTransitions();

    const auction = db.prepare(`
      SELECT a.*, w.final_price,
             j.title as jersey_title, j.player_name, j.club_name, j.league_name,
             j.season, j.size, j.condition, j.jersey_type, j.is_signed, j.has_coa, j.description, j.seller_id,
             c.name as category_name, u.full_name as seller_name
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN users u ON j.seller_id = u.id
      LEFT JOIN auction_winners w ON w.auction_id = a.id
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

    // Get active certificate if this LelangBid item has COA
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
  const { jerseyId, startPrice, minIncrement, startTime, endTime, reservePrice } = req.body;

  if (!jerseyId || !startPrice || !startTime || !endTime) {
    return res.status(400).json({ message: 'Jersey ID, start price, start time, and end time are required' });
  }

  try {
    // Validate jersey is verified and not already in an active auction
    const jersey = db.prepare(`
      SELECT status, auction_start_price, reserve_price
      FROM jerseys
      WHERE id = ?
    `).get(jerseyId) as any;
    if (!jersey) {
      return res.status(404).json({ message: 'Jersey not found' });
    }
    if (jersey.status !== 'verified') {
      return res.status(400).json({ message: 'Only verified jerseys can be auctioned' });
    }

    const activeAuction = db.prepare(`
      SELECT id FROM auctions WHERE jersey_id = ? AND status IN ('upcoming', 'live', 'negotiation')
    `).get(jerseyId);

    if (activeAuction) {
      return res.status(400).json({ message: 'This jersey is already in an active or upcoming auction' });
    }

    const normalizedStartPrice = Number(startPrice);
    const normalizedReservePrice = reservePrice !== undefined && reservePrice !== null && reservePrice !== ''
      ? Number(reservePrice)
      : Number(jersey.reserve_price || 0);
    const normalizedMinIncrement = Number(minIncrement || 50000);
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      !Number.isFinite(normalizedStartPrice) ||
      normalizedStartPrice <= 0 ||
      !Number.isFinite(normalizedReservePrice) ||
      normalizedReservePrice < 0 ||
      !Number.isFinite(normalizedMinIncrement) ||
      normalizedMinIncrement <= 0
    ) {
      return res.status(400).json({ message: 'Auction prices and increment must be valid positive numbers' });
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Start time and end time must be valid dates' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    if (normalizedReservePrice > 0 && normalizedReservePrice < normalizedStartPrice) {
      return res.status(400).json({ message: 'Final minimum price must be greater than or equal to the starting price' });
    }

    const auctionId = randomUUID();
    const now = new Date();
    let initialStatus = 'upcoming';

    if (start <= now) {
      initialStatus = 'live';
    }

    db.prepare(`
      INSERT INTO auctions (id, jersey_id, start_price, current_price, min_increment, reserve_price, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auctionId,
      jerseyId,
      normalizedStartPrice,
      normalizedStartPrice, // current_price initially equal to start_price
      normalizedMinIncrement,
      normalizedReservePrice,
      startTime,
      endTime,
      initialStatus
    );

    return res.status(201).json({ message: 'Auction created successfully', auctionId, status: initialStatus });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('UNIQUE') && errorMessage.includes('auctions')) {
      return res.status(400).json({ message: 'This jersey is already in an active or upcoming auction' });
    }

    console.error('Error creating auction:', error);
    return res.status(500).json({ message: 'Error creating auction' });
  }
});

// PATCH seller decision after a reserve-price negotiation
router.patch('/:id/seller-decision', authenticateToken, requireRole(['seller', 'admin']), (req: AuthRequest, res) => {
  const { id: auctionId } = req.params;
  const { decision } = req.body;
  const userId = req.user!.id;
  const role = req.user!.role;

  if (!['accepted', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be accepted or rejected' });
  }

  try {
    const auction = db.prepare(`
      SELECT a.*, j.title as jersey_title, j.seller_id
      FROM auctions a
      LEFT JOIN jerseys j ON a.jersey_id = j.id
      WHERE a.id = ?
    `).get(auctionId) as any;

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    if (role === 'seller' && auction.seller_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: This is not your auction' });
    }

    if (auction.status !== 'negotiation') {
      return res.status(400).json({ message: `Auction is not waiting for seller negotiation. Current status: ${auction.status}` });
    }

    const highestBid = db.prepare(`
      SELECT user_id, bid_amount
      FROM bids
      WHERE auction_id = ?
      ORDER BY bid_amount DESC
      LIMIT 1
    `).get(auctionId) as any;

    if (!highestBid) {
      db.prepare("UPDATE auctions SET status = 'failed', winner_user_id = NULL WHERE id = ?").run(auctionId);
      return res.json({ message: 'Auction marked as failed because there were no bids', status: 'failed' });
    }

    if (decision === 'accepted') {
      const winnerId = randomUUID();
      const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const existingWinner = db.prepare('SELECT id FROM auction_winners WHERE auction_id = ?').get(auctionId) as any;

      db.prepare("UPDATE auctions SET status = 'closed', winner_user_id = ?, current_price = ? WHERE id = ?")
        .run(highestBid.user_id, highestBid.bid_amount, auctionId);

      if (!existingWinner) {
        db.prepare(`
          INSERT INTO auction_winners (id, auction_id, user_id, final_price, status, payment_deadline)
          VALUES (?, ?, ?, ?, 'waiting_payment', ?)
        `).run(winnerId, auctionId, highestBid.user_id, highestBid.bid_amount, paymentDeadline);
      }

      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        highestBid.user_id,
        'Seller Accepted Your Final Bid',
        `The seller accepted your final bid of Rp ${highestBid.bid_amount.toLocaleString('id-ID')} for "${auction.jersey_title}". Please upload payment proof before the deadline.`,
        'winner'
      );

      SseService.broadcast('auction_status', {
        auctionId,
        status: 'closed',
        winnerUserId: highestBid.user_id,
        finalPrice: highestBid.bid_amount
      }, auctionId);

      return res.json({ message: 'Seller accepted the negotiated price. Auction is successful.', status: 'closed' });
    }

    db.prepare("UPDATE auctions SET status = 'failed', winner_user_id = NULL WHERE id = ?").run(auctionId);
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      highestBid.user_id,
      'Auction Was Not Successful',
      `The seller did not accept the final bid of Rp ${highestBid.bid_amount.toLocaleString('id-ID')} for "${auction.jersey_title}". The auction was marked as unsuccessful.`,
      'auction_failed'
    );

    SseService.broadcast('auction_status', {
      auctionId,
      status: 'failed',
      winnerUserId: null,
      finalPrice: highestBid.bid_amount
    }, auctionId);

    return res.json({ message: 'Seller rejected the negotiated price. Auction is not successful.', status: 'failed' });
  } catch (error) {
    console.error('Error saving seller auction decision:', error);
    return res.status(500).json({ message: 'Error saving seller auction decision' });
  }
});

// POST bid (member or seller - except self bidding)
router.post('/:id/bid', authenticateToken, requireRole(['member', 'seller', 'admin']), (req: AuthRequest, res) => {
  const { id: auctionId } = req.params;
  const { bidAmount } = req.body;
  const userId = req.user!.id;
  const normalizedBidAmount = Number(bidAmount);

  if (!Number.isFinite(normalizedBidAmount) || normalizedBidAmount <= 0) {
    return res.status(400).json({ message: 'A valid bid amount is required' });
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

    if (normalizedBidAmount < minAllowed) {
      return res.status(400).json({ message: `Bid amount must be at least Rp ${minAllowed.toLocaleString('id-ID')}` });
    }

    const requiredDeposit = calculateBidDepositRequirement(normalizedBidAmount);
    const bidder = db.prepare('SELECT deposit_balance FROM users WHERE id = ?').get(userId) as any;
    const depositBalance = Number(bidder?.deposit_balance || 0);

    if (req.user!.role !== 'admin' && depositBalance < requiredDeposit) {
      const depositShortfall = requiredDeposit - depositBalance;
      return res.status(402).json({
        message: `Security deposit must be verified at Rp ${requiredDeposit.toLocaleString('id-ID')} before bidding. Please submit a deposit request for Rp ${depositShortfall.toLocaleString('id-ID')} and wait for admin verification.`,
        depositBalance,
        requiredDeposit,
        depositShortfall,
        ...getDepositPolicy()
      });
    }

    // Insert bid
    const bidId = randomUUID();
    db.prepare(`
      INSERT INTO bids (id, auction_id, user_id, bid_amount) VALUES (?, ?, ?, ?)
    `).run(bidId, auctionId, userId, normalizedBidAmount);

    // Update auction current price
    db.prepare(`
      UPDATE auctions SET current_price = ? WHERE id = ?
    `).run(normalizedBidAmount, auctionId);

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
          VALUES (?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          prevBidder.user_id,
          'You have been outbid!',
          `Someone placed a higher bid of Rp ${normalizedBidAmount.toLocaleString('id-ID')} on "${auction.jersey_title}". Place another bid now!`,
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
      currentPrice: normalizedBidAmount,
      endTime: finalEndTime,
      extended: sniperExtended,
      bids: updatedBids
    }, auctionId);

    return res.status(201).json({
      message: 'Bid placed successfully',
      bidId,
      currentPrice: normalizedBidAmount,
      endTime: finalEndTime,
      extended: sniperExtended
    });
  } catch (error) {
    console.error('Error processing bid:', error);
    return res.status(500).json({ message: 'Error processing bid' });
  }
});

export default router;
