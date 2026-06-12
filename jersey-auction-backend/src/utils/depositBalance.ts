import db from '../config/db';

const parseStoredDate = (value?: string | null) => {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export function syncUserDepositBalance(userId: string) {
  const user = db.prepare('SELECT deposit_balance FROM users WHERE id = ?').get(userId) as any;
  if (!user) return 0;

  const storedBalance = Number(user.deposit_balance || 0);
  if (storedBalance > 0) return storedBalance;

  const deposits = db.prepare(`
    SELECT amount, verified_at, created_at
    FROM deposits
    WHERE user_id = ? AND status = 'verified'
  `).all(userId) as Array<{ amount: number; verified_at?: string | null; created_at?: string | null }>;

  if (deposits.length === 0) return storedBalance;

  const cancelledWinners = db.prepare(`
    SELECT payment_deadline, created_at
    FROM auction_winners
    WHERE user_id = ? AND status = 'cancelled'
  `).all(userId) as Array<{ payment_deadline?: string | null; created_at?: string | null }>;

  const latestForfeitTime = cancelledWinners.reduce((latest, winner) => {
    const eventTime = parseStoredDate(winner.payment_deadline || winner.created_at);
    return Math.max(latest, eventTime);
  }, 0);

  const restorableBalance = deposits.reduce((sum, deposit) => {
    const depositTime = parseStoredDate(deposit.verified_at || deposit.created_at);
    if (latestForfeitTime > 0 && depositTime <= latestForfeitTime) return sum;
    return sum + Number(deposit.amount || 0);
  }, 0);

  if (restorableBalance > storedBalance) {
    db.prepare('UPDATE users SET deposit_balance = ? WHERE id = ?').run(restorableBalance, userId);
    return restorableBalance;
  }

  return storedBalance;
}

export function reconcileVerifiedDepositBalances() {
  const users = db.prepare(`
    SELECT DISTINCT u.id
    FROM users u
    INNER JOIN deposits d ON d.user_id = u.id AND d.status = 'verified'
    WHERE COALESCE(u.deposit_balance, 0) <= 0
  `).all() as Array<{ id: string }>;

  let reconciled = 0;

  users.forEach(user => {
    const balance = syncUserDepositBalance(user.id);
    if (balance > 0) {
      reconciled += 1;
    }
  });

  return reconciled;
}
