import React, { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import AuctionCard, { AuctionData } from '../../components/auction/AuctionCard';
import { Gavel, Award, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [liveAuctions, setLiveAuctions] = useState<AuctionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveAuctions = useCallback(async () => {
    try {
      const response = await api.get('/auctions?status=live');
      setLiveAuctions(response.data.slice(0, 3)); // show top 3 live auctions
    } catch (error) {
      console.error('Error loading live auctions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveAuctions();
  }, [fetchLiveAuctions]);

  const handleAuctionEnded = useCallback(() => {
    window.setTimeout(() => {
      fetchLiveAuctions();
    }, 300);
  }, [fetchLiveAuctions]);

  return (
    <div className="pb-16">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-black border-b border-brand-accent-red/20 py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(218,41,28,0.08),transparent_42%)]" />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-brand-gold/10 border border-brand-gold/25 px-4 py-1.5 rounded-full mb-6">
            <Award className="text-brand-gold" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest gold-gradient-text">
              Premium Jersey Auction Marketplace
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-100 uppercase tracking-tight leading-none">
            Collect Original Match-Worn <br className="hidden sm:inline" />
            & Signed <span className="gold-gradient-text">Jersey LelangBid</span>
          </h1>
          
          <p className="mt-6 max-w-2xl mx-auto text-sm sm:text-base text-slate-400 font-medium leading-relaxed">
            Bid on verified collectibles from historical football games with official certificates of authenticity (COA). 100% genuine football jerseys from collectors around the world.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/auctions?status=live"
              className="w-full sm:w-auto px-8 py-4 font-black uppercase tracking-wider text-sm text-brand-navy gold-gradient-bg rounded-xl hover:brightness-110 shadow-premium-glow hover:shadow-premium-glow-heavy transition-all duration-300"
            >
              Enter Live Bids
            </Link>
            <Link
              to="/auctions?status=upcoming"
              className="w-full sm:w-auto px-8 py-4 font-black uppercase tracking-wider text-sm border border-slate-700 bg-brand-navy-light/40 hover:bg-slate-800 text-slate-200 rounded-xl transition-all duration-300"
            >
              See Upcoming Drops
            </Link>
          </div>
        </div>
      </section>

      {/* Feature stats / guarantee cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-brand-navy-light/20 border border-slate-800/80 flex space-x-4 items-start shadow-premium">
          <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 uppercase tracking-wide text-sm">COA Verification Guarantee</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Every signed or match-worn jersey includes an official certificate matching security barcodes, trackable on our public registry.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-brand-navy-light/20 border border-slate-800/80 flex space-x-4 items-start shadow-premium">
          <div className="p-3 bg-brand-accent-red/10 rounded-xl text-brand-accent-red">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 uppercase tracking-wide text-sm">Realtime Bidding Engine</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Our instant Server-Sent Events engine updates prices without page refreshes, notifying you immediately if you are outbid.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-brand-navy-light/20 border border-slate-800/80 flex space-x-4 items-start shadow-premium">
          <div className="p-3 bg-brand-accent/10 rounded-xl text-brand-accent">
            <Gavel size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 uppercase tracking-wide text-sm">Anti-Sniper Extension</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Fair play rule: placing a bid in the final 2 minutes automatically extends the auction clock by 2 minutes, preventing last-second sniping.
            </p>
          </div>
        </div>
      </section>

      {/* Live Auctions Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="flex items-end justify-between mb-8 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent-red animate-pulse" />
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100">Live Jersey Auctions</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">LelangBid items currently open for live bidding. Bid before they close!</p>
          </div>

          <Link to="/auctions?status=live" className="text-xs font-bold text-brand-gold hover:underline flex items-center">
            View All Live <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 rounded-2xl bg-brand-navy-light/10 animate-pulse border border-slate-800/50" />
            ))}
          </div>
        ) : liveAuctions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl bg-brand-navy-light/10">
            <Gavel className="text-slate-600 mx-auto mb-3" size={36} />
            <p className="text-slate-400 font-bold">No live auctions at the moment</p>
            <p className="text-xs text-slate-500 mt-1.5 mb-5">Please check our upcoming catalog schedule.</p>
            <Link to="/auctions?status=upcoming" className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-navy gold-gradient-bg">
              View Upcoming Drops
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} onAuctionEnded={handleAuctionEnded} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
export default HomePage;
