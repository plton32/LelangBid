import React from 'react';
import { Gavel } from 'lucide-react';

export interface BidRecord {
  id: string;
  user_id: string;
  user_name: string;
  bid_amount: number;
  created_at: string;
}

interface BidHistoryProps {
  bids: BidRecord[];
  highlightedBidId?: string;
}

export const BidHistory: React.FC<BidHistoryProps> = ({ bids, highlightedBidId }) => {
  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  };

  if (!bids || bids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl text-center bg-brand-navy-light/10">
        <Gavel className="text-slate-600 mb-3" size={32} />
        <p className="text-sm font-semibold text-slate-400">No bids placed yet</p>
        <p className="text-xs text-slate-500 mt-1">Be the first to place a bid on this LelangBid item!</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy-light/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
      <div className="px-5 py-4 bg-brand-navy-light/40 border-b border-slate-800">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Bid History ({bids.length})</h4>
      </div>

      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-800/60">
        {bids.map((bid, index) => {
          const isHighest = index === 0;
          const isHighlighted = bid.id === highlightedBidId;

          return (
            <div
              key={bid.id}
              className={`px-5 py-3.5 flex items-center justify-between transition-colors duration-300 ${
                isHighest ? 'bg-brand-gold/5' : ''
              } ${isHighlighted ? 'animate-bid-highlight' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                  isHighest ? 'gold-gradient-bg text-brand-navy' : 'bg-slate-800 text-slate-300'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <span className={`block text-xs font-bold ${isHighest ? 'text-brand-gold' : 'text-slate-300'}`}>
                    {bid.user_name || 'Anonymous User'}
                    {isHighest && <span className="ml-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-gold text-brand-navy">Leader</span>}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{formatDate(bid.created_at)}</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`font-mono text-sm font-black ${isHighest ? 'text-brand-gold' : 'text-slate-200'}`}>
                  {formatPrice(bid.bid_amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default BidHistory;
