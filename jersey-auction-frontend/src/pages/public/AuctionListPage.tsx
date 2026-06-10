import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import AuctionCard, { AuctionData } from '../../components/auction/AuctionCard';
import Badge from '../../components/ui/Badge';
import ScrollableTabBar from '../../components/ui/ScrollableTabBar';
import { Gavel, Filter } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export const AuctionListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || '';
  const categoryParam = searchParams.get('category') || '';

  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load categories
    const loadCategories = async () => {
      try {
        const res = await api.get('/jerseys/categories');
        setCategories(res.data);
      } catch (err) {
        console.error('Error categories loading:', err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    // Load auctions
    const loadAuctions = async () => {
      setLoading(true);
      try {
        let url = '/auctions';
        const params: string[] = [];
        if (statusParam) params.push(`status=${statusParam}`);
        if (categoryParam) params.push(`categorySlug=${categoryParam}`);
        
        if (params.length > 0) {
          url += '?' + params.join('&');
        }

        const res = await api.get(url);
        setAuctions(res.data);
      } catch (err) {
        console.error('Error loading auctions:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAuctions();
  }, [statusParam, categoryParam]);

  const handleStatusTab = (status: string) => {
    setSearchParams(prev => {
      if (status) {
        prev.set('status', status);
      } else {
        prev.delete('status');
      }
      return prev;
    });
  };

  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSearchParams(prev => {
      if (value) {
        prev.set('category', value);
      } else {
        prev.delete('category');
      }
      return prev;
    });
  };

  const tabs = [
    { label: 'All Catalog', value: '' },
    { label: 'Live Now', value: 'live' },
    { label: 'Upcoming Drops', value: 'upcoming' },
    { label: 'Under Review', value: 'negotiation' },
    { label: 'Not Successful', value: 'failed' },
    { label: 'Closed/Ended', value: 'closed' }
  ];
  const statusTabs = tabs.map(tab => ({ id: tab.value, label: tab.label }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* List Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-100 flex items-center">
            <Gavel className="mr-2.5 text-brand-gold" size={24} />
            Jersey LelangBid Catalogs
          </h1>
          <p className="text-xs text-slate-500 mt-1">Explore our exclusive collections of authenticated vintage, signed, and match worn football shirts.</p>
        </div>

        {/* Category select filter */}
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={categoryParam}
            onChange={handleCategoryFilter}
            className="px-4 py-2 bg-brand-navy-light/40 border border-slate-850 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl focus:outline-none focus:border-brand-gold/60"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs list */}
      <ScrollableTabBar
        items={statusTabs}
        activeId={statusParam}
        onChange={handleStatusTab}
        className="mb-8 max-w-xl"
      />

      {/* Cards list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-96 rounded-2xl bg-brand-navy-light/10 animate-pulse border border-slate-800/50" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-brand-navy-light/10 max-w-2xl mx-auto">
          <Gavel className="text-slate-600 mx-auto mb-3" size={36} />
          <p className="text-slate-300 font-bold">No auctions found matching criteria</p>
          <p className="text-xs text-slate-500 mt-1.5">Try changing your search status or filter settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
};
export default AuctionListPage;
