import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import Countdown from '../../components/ui/Countdown';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import BidBox from '../../components/auction/BidBox';
import BidHistory, { BidRecord } from '../../components/auction/BidHistory';
import { ShieldAlert, Award, Calendar, ShieldCheck, User } from 'lucide-react';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [auction, setAuction] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [highlightedBidId, setHighlightedBidId] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch initial details
  const fetchDetails = async () => {
    try {
      const response = await api.get(`/auctions/${id}`);
      const data = response.data;
      setAuction(data);
      setImages(data.images || []);
      setBids(data.bids || []);
      
      if (data.images && data.images.length > 0) {
        setActiveImage(data.images[0].image_url);
      }
    } catch (error) {
      console.error('Error loading auction details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // SSE connection for realtime bidding updates
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${API_URL.replace('/api', '')}/api/auctions/${id}/sse`;
    console.log(`Connecting to SSE stream: ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('new_bid', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Realtime new bid received via SSE:', data);

      if (data.auctionId === id) {
        setAuction((prev: any) => ({
          ...prev,
          current_price: data.currentPrice,
          end_time: data.endTime
        }));

        setBids(data.bids);

        // Highlight new bid in history log
        if (data.bids && data.bids.length > 0) {
          const newBidId = data.bids[0].id;
          setHighlightedBidId(newBidId);
          setTimeout(() => setHighlightedBidId(''), 2000);
        }

        if (data.extended) {
          setMessage({
            text: '🔔 Auction extended by 2 minutes due to last-minute bid! (Anti-Sniper Rule)',
            type: 'success'
          });
          setTimeout(() => setMessage(null), 5000);
        }
      }
    });

    eventSource.addEventListener('auction_status', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Auction status change:', data);
      if (data.auctionId === id) {
        setAuction((prev: any) => ({
          ...prev,
          status: data.status
        }));
        fetchDetails();
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error, closing stream:', err);
      eventSource.close();
    };

    return () => {
      console.log('Closing SSE connection...');
      eventSource.close();
    };
  }, [id]);

  const handlePlaceBid = async (amount: number) => {
    setBidLoading(true);
    setMessage(null);
    try {
      const res = await api.post(`/auctions/${id}/bid`, { bidAmount: amount });
      setMessage({
        text: `Bid of Rp ${amount.toLocaleString('id-ID')} placed successfully!`,
        type: 'success'
      });
      // The SSE broadcast will automatically update prices and bids history, so we don't need manual state updates here
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err.response?.data?.message || 'Error processing bid. Please try again.',
        type: 'error'
      });
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
        <p className="mt-4 text-xs text-slate-500 font-bold uppercase tracking-widest">Loading auction specifications...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-200">Auction Listing Not Found</h2>
        <Link to="/auctions" className="mt-4 inline-block text-brand-gold hover:underline">Return to catalogs</Link>
      </div>
    );
  }

  const isLive = auction.status === 'live';
  const isUpcoming = auction.status === 'upcoming';
  const isClosed = auction.status === 'closed';

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  const getFullImgUrl = (url: string) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : defaultPlaceholder;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Toast feedback alerts */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-semibold text-center ${
          message.type === 'success' 
            ? 'bg-brand-accent-green/10 border-brand-accent-green/45 text-brand-accent-green' 
            : 'bg-brand-accent-red/10 border-brand-accent-red/45 text-brand-accent-red'
        }`}>
          {message.text}
        </div>
      )}

      {/* Main product display grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Photo gallery (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-premium">
            <img
              src={getFullImgUrl(activeImage || (images[0]?.image_url))}
              alt={auction.jersey_title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Sub-gallery thumbnails list */}
          {images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto py-1">
              {images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`w-20 aspect-[4/3] rounded-lg overflow-hidden border shrink-0 transition-colors ${
                    (activeImage === img.image_url) ? 'border-brand-gold' : 'border-slate-800'
                  }`}
                >
                  <img
                    src={getFullImgUrl(img.image_url)}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Bid Box & Auction specifications (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant={auction.status}>{auction.status}</Badge>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-black">
                Category: {auction.category_name}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100 uppercase tracking-wide">
              {auction.jersey_title}
            </h1>
          </div>

          {/* Countdown & Price Display Banner */}
          <Card className="bg-brand-navy border-slate-850 p-6 flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {isClosed ? 'Winning Final Bid' : isUpcoming ? 'Starting Bid' : 'Current Leading Bid'}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-brand-gold font-mono tracking-tight">
                Rp {(auction.current_price || auction.start_price).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="text-center sm:text-right">
              {isClosed ? (
                <Badge variant="closed" className="py-1 px-4 text-xs font-black">Auction Closed</Badge>
              ) : isUpcoming ? (
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Starts At</span>
                  <span className="text-xs font-bold text-slate-300">
                    {new Date(auction.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[10px] text-brand-accent-red font-black uppercase tracking-widest mb-1.5 flex items-center">
                    <span className="w-1.5 h-1.5 bg-brand-accent-red rounded-full mr-1.5 animate-pulse" />
                    Bidding Ends In
                  </span>
                  <Countdown endTime={auction.end_time} />
                </div>
              )}
            </div>
          </Card>

          {/* Bid Form box (only if live) */}
          {isLive && (
            <BidBox
              currentPrice={auction.current_price}
              minIncrement={auction.min_increment}
              startPrice={auction.start_price}
              bidsCount={bids.length}
              sellerId={auction.seller_id}
              currentUserId={user?.id}
              onPlaceBid={handlePlaceBid}
              loading={bidLoading}
            />
          )}

          {/* Upcoming drops notice banner */}
          {isUpcoming && (
            <div className="p-4 bg-brand-navy-light/10 border border-slate-800 rounded-2xl flex items-start space-x-3 text-slate-400">
              <Calendar className="text-brand-accent mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs font-bold text-slate-300">Catalog drop is scheduled</p>
                <p className="text-[11px] mt-1">This auction will open for bidding on the scheduled start time. Add this page to bookmarks to prepare your bids!</p>
              </div>
            </div>
          )}

          {/* COA verification details banner */}
          {auction.has_coa === 1 && auction.coa && (
            <div className="p-4 bg-brand-gold/5 border border-brand-gold/15 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-brand-gold shrink-0" size={24} />
                <div>
                  <p className="text-xs font-black uppercase text-slate-200">COA Certified Authenticity</p>
                  <p className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-0.5">Barcode No: {auction.coa.coa_number}</p>
                </div>
              </div>
              <Link
                to={`/verify/${auction.coa.coa_number}`}
                className="px-4 py-2 border border-brand-gold/30 hover:border-brand-gold/60 text-[10px] font-bold text-brand-gold rounded-xl transition-colors uppercase tracking-wider"
              >
                Validate COA
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Grid bottom sections: Specs Details vs Bidding History Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12 pt-10 border-t border-slate-850">
        
        {/* Specifications details (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-350 mb-4 pb-2 border-b border-slate-850">Jersey Specifications</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Player Backname</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block">{auction.player_name || 'Generic Print'}</span>
              </div>
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Club / National Team</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block">{auction.club_name || 'Generic Team'}</span>
              </div>
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">League / Competition</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block">{auction.league_name || 'N/A'}</span>
              </div>
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Season / Years</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block">{auction.season || 'N/A'}</span>
              </div>
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Jersey Type</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block uppercase">{auction.jersey_type?.replace(/-/g, ' ') || 'Replica'}</span>
              </div>
              <div className="p-3 bg-brand-navy-light/10 rounded-xl border border-slate-850">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Signed Collectible</span>
                <span className="font-bold text-slate-200 text-xs mt-1 block">{auction.is_signed === 1 ? 'Yes, Hand Signed' : 'No'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-350 mb-3 pb-2 border-b border-slate-850">Item Description</h3>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{auction.description || 'No description provided.'}</p>
          </div>

          {/* Seller metadata section */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 flex items-center space-x-3">
            <div className="p-2.5 bg-slate-800 rounded-full text-slate-300">
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Listed By Store/Collector</span>
              <span className="text-xs font-bold text-slate-200">{auction.seller_name || 'Verified Collector'}</span>
            </div>
          </div>
        </div>

        {/* Bidding log history (5 columns) */}
        <div className="lg:col-span-5">
          <BidHistory bids={bids} highlightedBidId={highlightedBidId} />
        </div>
      </div>
    </div>
  );
};
export default AuctionDetailPage;
