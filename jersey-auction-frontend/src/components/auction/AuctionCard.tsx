import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Countdown from '../ui/Countdown';

export interface AuctionData {
  id: string;
  jersey_id: string;
  jersey_title: string;
  condition: string;
  size: string;
  is_signed: number;
  has_coa: number;
  category_name: string;
  main_image: string;
  start_price: number;
  current_price: number;
  reserve_price?: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'live' | 'closed' | 'negotiation' | 'failed';
}

interface AuctionCardProps {
  auction: AuctionData;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const isLive = auction.status === 'live';
  const isUpcoming = auction.status === 'upcoming';
  const isClosed = auction.status === 'closed';
  const isNegotiation = auction.status === 'negotiation';
  const isFailed = auction.status === 'failed';

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = () => {
    if (isLive) return <Badge variant="live">LIVE</Badge>;
    if (isUpcoming) return <Badge variant="upcoming">UPCOMING</Badge>;
    if (isNegotiation) return <Badge variant="negotiation">UNDER REVIEW</Badge>;
    if (isFailed) return <Badge variant="failed">NOT SUCCESSFUL</Badge>;
    return <Badge variant="closed">CLOSED</Badge>;
  };

  const displayPriceLabel = () => {
    if (isUpcoming) return 'Start Price';
    if (isLive) return 'Current Bid';
    if (isNegotiation) return 'Final Bid';
    if (isFailed) return 'Final Bid';
    return 'Final Price';
  };

  const imageUrl = auction.main_image 
    ? (auction.main_image.startsWith('http') ? auction.main_image : `http://localhost:5000${auction.main_image}`) 
    : 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';

  return (
    <Card hoverEffect className="overflow-hidden flex flex-col h-full bg-brand-navy-light/35 border-slate-800/80 hover:border-brand-gold/20">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
        <img
          src={imageUrl}
          alt={auction.jersey_title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute top-3 left-3 z-10">
          {getStatusBadge()}
        </div>
        {auction.has_coa === 1 && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="gold">COA Certified</Badge>
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="flex-1 flex flex-col justify-between mt-4">
        <div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-accent mb-1">
            <span>{auction.category_name}</span>
            <span className="text-slate-400">Size: {auction.size || 'N/A'}</span>
          </div>

          <h3 className="font-bold text-slate-100 line-clamp-2 hover:text-brand-gold duration-200 text-sm md:text-base">
            <Link to={`/auctions/${auction.id}`}>{auction.jersey_title}</Link>
          </h3>
          
          <p className="text-xs text-slate-400 mt-1.5 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-500 mr-1.5"></span>
            Condition: {auction.condition || 'Good'}
          </p>
        </div>

        {/* Pricing & Bid Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80">
          <div className="flex items-end justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {displayPriceLabel()}
              </span>
              <span className="text-base font-extrabold text-slate-100 font-mono">
                {formatPrice(auction.current_price || auction.start_price)}
              </span>
            </div>
            
            <div className="text-right">
              {isClosed ? (
                <span className="text-xs font-bold text-slate-500 uppercase">Auction Ended</span>
              ) : isNegotiation ? (
                <span className="text-xs font-bold text-amber-400 uppercase">Seller Review</span>
              ) : isFailed ? (
                <span className="text-xs font-bold text-rose-400 uppercase">Not Successful</span>
              ) : isUpcoming ? (
                <div className="text-[10px] text-slate-400 uppercase">
                  Starts At: {new Date(auction.start_time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-brand-accent-red font-bold uppercase tracking-widest mb-0.5">Ends In:</span>
                  <Countdown endTime={auction.end_time} compact />
                </div>
              )}
            </div>
          </div>

          <Link
            to={`/auctions/${auction.id}`}
            className="mt-4 w-full inline-flex justify-center items-center py-2.5 px-4 text-xs font-black uppercase tracking-widest text-brand-navy gold-gradient-bg rounded-xl hover:brightness-110 transition-all font-sans duration-200"
          >
            {isClosed || isNegotiation || isFailed ? 'View Result' : isUpcoming ? 'View Auction' : 'Place Bid'}
          </Link>
        </div>
      </div>
    </Card>
  );
};
export default AuctionCard;
