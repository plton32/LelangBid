import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';

interface BidBoxProps {
  currentPrice: number;
  minIncrement: number;
  startPrice: number;
  bidsCount: number;
  sellerId: string;
  currentUserId?: string;
  depositBalance?: number;
  bidDepositRequired?: number;
  depositRefundRate?: number;
  onPlaceBid: (amount: number) => Promise<void>;
  loading: boolean;
}

export const BidBox: React.FC<BidBoxProps> = ({
  currentPrice,
  minIncrement,
  startPrice,
  bidsCount,
  sellerId,
  currentUserId,
  depositBalance = 0,
  bidDepositRequired = 1000000,
  depositRefundRate = 0.7,
  onPlaceBid,
  loading
}) => {
  const isOwner = currentUserId === sellerId;
  const nextMinBid = bidsCount > 0 ? currentPrice + minIncrement : startPrice;
  const [bidAmount, setBidAmount] = useState<string>(String(nextMinBid));
  const [error, setError] = useState<string>('');
  const requiredDeposit = bidDepositRequired;
  const depositShortfall = Math.max(0, requiredDeposit - depositBalance);
  const hasEnoughDeposit = depositShortfall === 0;
  const refundPercent = Math.round(depositRefundRate * 100);

  const formatPrice = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

  useEffect(() => {
    setBidAmount(prev => {
      const amount = Number(prev);
      return Number.isFinite(amount) && amount >= nextMinBid ? prev : String(nextMinBid);
    });
  }, [nextMinBid]);

  const handleQuickAdd = (amountToAdd: number) => {
    const base = Math.max(Number(bidAmount) || 0, currentPrice);
    setBidAmount(String(base + amountToAdd));
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidAmount(e.target.value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    if (amount < nextMinBid) {
      setError(`Minimum bid amount is Rp ${nextMinBid.toLocaleString('id-ID')}`);
      return;
    }

    if (!hasEnoughDeposit) {
      setError(`Security deposit must be at least ${formatPrice(requiredDeposit)} before bidding`);
      return;
    }

    onPlaceBid(amount);
  };

  if (isOwner) {
    return (
      <div className="bg-brand-navy border border-amber-500/20 text-slate-300 p-5 rounded-2xl text-center shadow-inner">
        <p className="text-sm font-semibold text-brand-gold">You own this listing</p>
        <p className="text-xs text-slate-400 mt-1">Sellers are not allowed to bid on their own auctions.</p>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="bg-brand-navy/60 border border-slate-800 p-5 rounded-2xl text-center">
        <p className="text-sm text-slate-300">You must be logged in to bid on this jersey.</p>
        <a 
          href="/login" 
          className="mt-3 inline-block px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-brand-navy gold-gradient-bg"
        >
          Login to Account
        </a>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy-light/25 border border-slate-800/80 rounded-2xl p-5 shadow-premium">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Minimum Bid Required</span>
        <span className="text-sm font-black text-brand-gold font-mono">{formatPrice(nextMinBid)}</span>
      </div>

      <div className={`mb-4 rounded-xl border p-3 ${
        hasEnoughDeposit
          ? 'border-brand-accent-green/25 bg-brand-accent-green/5'
          : 'border-brand-accent-red/35 bg-brand-accent-red/10'
      }`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Active Deposit</span>
            <span className="mt-1 block text-xs font-black font-mono text-slate-200">{formatPrice(depositBalance)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Required Deposit</span>
            <span className="mt-1 block text-xs font-black font-mono text-brand-gold">{formatPrice(requiredDeposit)}</span>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
          Deposit is verified manually by admin. If a winner does not complete payment, around {refundPercent}% of the deposit remains refundable.
        </p>

        {!hasEnoughDeposit && (
          <a
            href="/dashboard"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-brand-gold/25 bg-brand-navy px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-gold hover:border-brand-gold/60"
          >
            Submit Deposit Proof
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-3 text-sm font-bold text-slate-500">Rp</span>
            <input
              type="number"
              value={bidAmount}
              onChange={handleInputChange}
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 bg-brand-navy text-slate-100 placeholder-slate-600 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 font-mono font-bold"
            />
          </div>

          <Button type="submit" variant="gold" loading={loading} disabled={!hasEnoughDeposit} className="py-3 px-6 rounded-xl text-xs uppercase tracking-widest">
            Place Bid
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-brand-accent-red font-semibold">{error}</p>
        )}

        {/* Quick Bid Additions */}
        <div className="mt-4 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleQuickAdd(50000)}
            disabled={loading}
            className="flex-1 py-2 bg-brand-navy hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg transition-colors font-mono"
          >
            +50k
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(100000)}
            disabled={loading}
            className="flex-1 py-2 bg-brand-navy hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg transition-colors font-mono"
          >
            +100k
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(250000)}
            disabled={loading}
            className="flex-1 py-2 bg-brand-navy hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg transition-colors font-mono"
          >
            +250k
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(500000)}
            disabled={loading}
            className="flex-1 py-2 bg-brand-navy hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg transition-colors font-mono"
          >
            +500k
          </button>
        </div>
      </form>
    </div>
  );
};
export default BidBox;
