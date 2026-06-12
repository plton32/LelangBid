import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { SseService } from './sse.service';

export function processAuctionStatusTransitions(now = new Date().toISOString()) {
  const upcoming = db.prepare(`
    SELECT a.id, j.title
    FROM auctions a
    LEFT JOIN jerseys j ON a.jersey_id = j.id
    WHERE a.status = 'upcoming' AND a.start_time <= ?
  `).all(now) as any[];

  if (upcoming.length > 0) {
    const updateToLive = db.prepare("UPDATE auctions SET status = 'live' WHERE id = ?");
    upcoming.forEach(auction => {
      updateToLive.run(auction.id);
      console.log(`Auction "${auction.title}" is now LIVE!`);
      SseService.broadcast('auction_status', { auctionId: auction.id, status: 'live' });
    });
  }

  const expired = db.prepare(`
    SELECT a.id, a.jersey_id, a.start_price, a.current_price, a.reserve_price, j.title, j.seller_id
    FROM auctions a
    LEFT JOIN jerseys j ON a.jersey_id = j.id
    WHERE a.status = 'live' AND a.end_time <= ?
  `).all(now) as any[];

  if (expired.length === 0) return;

  const updateToClosed = db.prepare("UPDATE auctions SET status = 'closed', winner_user_id = ?, current_price = ? WHERE id = ?");
  const updateToNegotiation = db.prepare("UPDATE auctions SET status = 'negotiation', winner_user_id = ? WHERE id = ?");
  const updateToFailed = db.prepare("UPDATE auctions SET status = 'failed', winner_user_id = NULL WHERE id = ?");
  const existingWinnerQuery = db.prepare('SELECT id FROM auction_winners WHERE auction_id = ?');
  const insertWinner = db.prepare(`
    INSERT INTO auction_winners (id, auction_id, user_id, final_price, status, payment_deadline)
    VALUES (?, ?, ?, ?, 'waiting_payment', ?)
  `);

  expired.forEach(auction => {
    const highestBid = db.prepare(`
      SELECT user_id, bid_amount FROM bids
      WHERE auction_id = ?
      ORDER BY bid_amount DESC LIMIT 1
    `).get(auction.id) as any;

    if (!highestBid) {
      updateToFailed.run(auction.id);
      console.log(`Auction "${auction.title}" failed with no bids.`);
      SseService.broadcast('auction_status', {
        auctionId: auction.id,
        status: 'failed',
        winnerUserId: null,
        finalPrice: 0
      }, auction.id);
      return;
    }

    const reservePrice = Number(auction.reserve_price || 0);
    if (reservePrice > 0 && highestBid.bid_amount < reservePrice) {
      updateToNegotiation.run(highestBid.user_id, auction.id);

      if (auction.seller_id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          auction.seller_id,
          'Auction Needs Seller Decision',
          `The highest bid for "${auction.title}" is Rp ${highestBid.bid_amount.toLocaleString('id-ID')}, below your final minimum price of Rp ${reservePrice.toLocaleString('id-ID')}. Please accept or reject this lower price from Seller Center.`,
          'auction_negotiation'
        );
      }

      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        highestBid.user_id,
        'Auction Under Seller Review',
        `Your final bid of Rp ${highestBid.bid_amount.toLocaleString('id-ID')} for "${auction.title}" is being reviewed by the seller because it is below the final minimum price.`,
        'auction_negotiation'
      );

      console.log(`Auction "${auction.title}" moved to negotiation. Highest bid: Rp ${highestBid.bid_amount}, reserve: Rp ${reservePrice}`);
      SseService.broadcast('auction_status', {
        auctionId: auction.id,
        status: 'negotiation',
        winnerUserId: highestBid.user_id,
        finalPrice: highestBid.bid_amount,
        reservePrice
      }, auction.id);
      return;
    }

    updateToClosed.run(highestBid.user_id, highestBid.bid_amount, auction.id);

    if (!existingWinnerQuery.get(auction.id)) {
      const winnerId = randomUUID();
      const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      insertWinner.run(winnerId, auction.id, highestBid.user_id, highestBid.bid_amount, paymentDeadline);
    }

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      highestBid.user_id,
      'Congratulations! You won the auction!',
      `You won the auction for "${auction.title}" with a bid of Rp ${highestBid.bid_amount.toLocaleString('id-ID')}. Please upload payment proof before deadline.`,
      'winner'
    );

    console.log(`Auction "${auction.title}" closed. Winner: ${highestBid.user_id}. Price: Rp ${highestBid.bid_amount}`);
    SseService.broadcast('auction_status', {
      auctionId: auction.id,
      status: 'closed',
      winnerUserId: highestBid.user_id,
      finalPrice: highestBid.bid_amount
    }, auction.id);
  });
}
