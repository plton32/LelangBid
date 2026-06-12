export const BID_INCREMENT_TIERS = [
  { threshold: 10000000, increment: 500000 },
  { threshold: 5000000, increment: 250000 },
  { threshold: 1000000, increment: 100000 },
  { threshold: 0, increment: 50000 }
];

export const getBidIncrementForAmount = (amount: number) => {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  return BID_INCREMENT_TIERS.find(tier => normalizedAmount >= tier.threshold)?.increment || 50000;
};

export const getNextMinimumBid = (currentPrice: number, startPrice: number, bidsCount: number) => {
  if (bidsCount <= 0) return startPrice;
  return currentPrice + getBidIncrementForAmount(currentPrice);
};
