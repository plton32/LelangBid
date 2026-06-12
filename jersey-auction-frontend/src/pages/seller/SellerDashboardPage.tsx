import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ScrollableTabBar from '../../components/ui/ScrollableTabBar';
import { Tag, PlusCircle, ShoppingBag, Sparkles, Plus, Gavel } from 'lucide-react';

type SellerTab = 'dashboard' | 'my-jerseys' | 'add-jersey' | 'my-auctions' | 'sales';
type AuctionStatus = 'live' | 'upcoming' | 'closed' | 'negotiation' | 'failed';

const getSellerTabFromPath = (pathname: string): SellerTab => {
  if (pathname.startsWith('/seller/add-jersey')) return 'add-jersey';
  if (pathname.startsWith('/seller/jerseys')) return 'my-jerseys';
  if (pathname.startsWith('/seller/auctions')) return 'my-auctions';
  if (pathname.startsWith('/seller/sales')) return 'sales';
  return 'dashboard';
};

interface Category {
  id: string;
  name: string;
}

interface JerseyData {
  id: string;
  title: string;
  category_name: string;
  player_name: string;
  club_name: string;
  season: string;
  size: string;
  condition: string;
  jersey_type: string;
  auction_start_time?: string | null;
  auction_end_time?: string | null;
  auction_start_price?: number | null;
  reserve_price?: number | null;
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected';
  images: any[];
}

interface AuctionData {
  id: string;
  jersey_title: string;
  main_image?: string;
  seller_id: string;
  start_price: number;
  current_price: number;
  final_price?: number | null;
  reserve_price?: number | null;
  start_time: string;
  end_time: string;
  status: AuctionStatus;
}

interface SaleData {
  id: string;
  jersey_title: string;
  winner_name: string;
  final_price: number;
  start_price?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  status: string;
}

export const SellerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SellerTab>(() => getSellerTabFromPath(location.pathname));
  const [jerseys, setJerseys] = useState<JerseyData[]>([]);
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form states for adding jersey
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [clubName, setClubName] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [season, setSeason] = useState('');
  const [size, setSize] = useState('L');
  const [condition, setCondition] = useState('Mint');
  const [jerseyType, setJerseyType] = useState('classic-jersey');
  const [isSigned, setIsSigned] = useState(false);
  const [hasCoa, setHasCoa] = useState(false);
  const [description, setDescription] = useState('');
  const [auctionStartTime, setAuctionStartTime] = useState('');
  const [auctionEndTime, setAuctionEndTime] = useState('');
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSellerData = async () => {
    try {
      const res = await api.get('/jerseys');
      setJerseys(res.data);

      const catRes = await api.get('/jerseys/categories');
      setCategories(catRes.data);

      const auctionsRes = await api.get('/auctions');
      setAuctions(auctionsRes.data.filter((auction: AuctionData) => auction.seller_id === user?.id));

      const shipmentsRes = await api.get('/shipments');
      setSales(shipmentsRes.data);
    } catch (err) {
      console.error('Error fetching seller details:', err);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, [user?.id]);

  useEffect(() => {
    const nextTab = getSellerTabFromPath(location.pathname);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [location.pathname]);

  const goToTab = (tab: SellerTab, path: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleAddJerseySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId) {
      setError('Title and Category are required');
      return;
    }

    const parsedStartPrice = Number(auctionStartPrice);
    const parsedReservePrice = Number(reservePrice);
    const parsedStartTime = new Date(auctionStartTime);
    const parsedEndTime = new Date(auctionEndTime);

    if (!auctionStartTime || !auctionEndTime || !auctionStartPrice || !reservePrice) {
      setError('Tanggal mulai lelang, berakhir lelang, harga awal lelang, dan harga akhir minimum wajib diisi');
      return;
    }

    if (
      Number.isNaN(parsedStartTime.getTime()) ||
      Number.isNaN(parsedEndTime.getTime()) ||
      !Number.isFinite(parsedStartPrice) ||
      !Number.isFinite(parsedReservePrice) ||
      parsedStartPrice <= 0 ||
      parsedReservePrice <= 0
    ) {
      setError('Tanggal dan harga lelang harus valid');
      return;
    }

    if (parsedEndTime <= parsedStartTime) {
      setError('Berakhir lelang harus setelah tanggal mulai lelang');
      return;
    }

    if (parsedReservePrice < parsedStartPrice) {
      setError('Harga akhir minimum harus lebih besar atau sama dengan harga awal lelang');
      return;
    }

    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('categoryId', categoryId);
      formData.append('playerName', playerName);
      formData.append('clubName', clubName);
      formData.append('leagueName', leagueName);
      formData.append('season', season);
      formData.append('size', size);
      formData.append('condition', condition);
      formData.append('jerseyType', jerseyType);
      formData.append('isSigned', String(isSigned));
      formData.append('hasCoa', String(hasCoa));
      formData.append('description', description);
      formData.append('auctionStartTime', auctionStartTime);
      formData.append('auctionEndTime', auctionEndTime);
      formData.append('auctionStartPrice', String(parsedStartPrice));
      formData.append('reservePrice', String(parsedReservePrice));

      if (imageFiles) {
        for (let i = 0; i < imageFiles.length; i++) {
          formData.append('images', imageFiles[i]);
        }
      }

      await api.post('/jerseys', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Jersey listing submitted for admin review!');
      
      // Reset form
      setTitle('');
      setCategoryId('');
      setPlayerName('');
      setClubName('');
      setLeagueName('');
      setSeason('');
      setDescription('');
      setAuctionStartTime('');
      setAuctionEndTime('');
      setAuctionStartPrice('');
      setReservePrice('');
      setImageFiles(null);
      setIsSigned(false);
      setHasCoa(false);

      // Refresh list
      fetchSellerData();
      
      setTimeout(() => {
        setActiveTab('my-jerseys');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error saving jersey listing');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    if (status === 'verified') return 'success';
    if (status === 'pending_verification') return 'warning';
    if (status === 'rejected') return 'danger';
    return 'closed';
  };

  const formatStatusLabel = (status: string) => {
    if (status === 'negotiation') return 'negotiation';
    if (status === 'failed') return 'not successful';
    return status.replace(/_/g, ' ');
  };

  const handleNegotiationDecision = async (auctionId: string, decision: 'accepted' | 'rejected') => {
    const confirmed = window.confirm(
      decision === 'accepted'
        ? 'Terima harga bid tertinggi di bawah harga akhir minimum dan lanjutkan transaksi?'
        : 'Tolak harga bid tertinggi dan tandai lelang tidak berhasil?'
    );

    if (!confirmed) return;

    try {
      await api.patch(`/auctions/${auctionId}/seller-decision`, { decision });
      fetchSellerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving auction decision');
    }
  };

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  const getFullImgUrl = (url?: string | null) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : defaultPlaceholder;
  };

  const formatPrice = (price?: number | null) => {
    return `Rp ${Number(price || 0).toLocaleString('id-ID')}`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatAuctionFinalPrice = (auction: AuctionData) => {
    if (auction.final_price !== null && auction.final_price !== undefined) {
      return formatPrice(auction.final_price);
    }

    if (auction.status === 'negotiation') {
      return `${formatPrice(auction.current_price)} (menunggu seller)`;
    }

    if (auction.status === 'failed') {
      return 'Tidak berhasil';
    }

    if (auction.status === 'closed') {
      return formatPrice(auction.current_price);
    }

    return 'Belum berakhir';
  };

  const sellerTabs: Array<{ id: SellerTab; label: string; path: string; icon?: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', path: '/seller' },
    { id: 'my-jerseys', label: `My Jerseys (${jerseys.length})`, path: '/seller/jerseys' },
    { id: 'my-auctions', label: `Auctions (${auctions.length})`, path: '/seller/auctions' },
    { id: 'sales', label: `Sales (${sales.length})`, path: '/seller/sales' },
    { id: 'add-jersey', label: 'Add Jersey', path: '/seller/add-jersey', icon: <Plus size={12} /> }
  ];

  return (
    <div className="space-y-8 text-xs font-sans">
      {/* Header Seller Center Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-premium border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100">Seller Center</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Manage your LelangBid shop, upload new listings, and trace approvals.</p>
          </div>
        </div>

        {/* Actions shortcut tabs */}
        <ScrollableTabBar
          items={sellerTabs}
          activeId={activeTab}
          onChange={(tabId) => {
            const tab = sellerTabs.find(item => item.id === tabId);
            if (tab) goToTab(tab.id, tab.path);
          }}
          className="w-full shrink-0 rounded-xl md:w-auto md:max-w-[min(100%,48rem)]"
        />
      </div>

      {/* RENDER DASHBOARD PAGE */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-brand-navy-light/10 text-center">
            <Tag className="text-brand-gold mx-auto mb-2" size={28} />
            <h3 className="font-bold text-slate-300 uppercase tracking-wider">Total Listings</h3>
            <span className="text-3xl font-black text-slate-100 font-mono mt-1 block">{jerseys.length}</span>
          </Card>
          <Card className="p-6 bg-brand-navy-light/10 text-center">
            <PlusCircle className="text-brand-accent mx-auto mb-2" size={28} />
            <h3 className="font-bold text-slate-300 uppercase tracking-wider">Pending Verification</h3>
            <span className="text-3xl font-black text-slate-100 font-mono mt-1 block">
              {jerseys.filter(j => j.status === 'pending_verification').length}
            </span>
          </Card>
          <Card className="p-6 bg-brand-navy-light/10 text-center">
            <ShoppingBag className="text-brand-accent-green mx-auto mb-2" size={28} />
            <h3 className="font-bold text-slate-300 uppercase tracking-wider">Verified/Approved</h3>
            <span className="text-3xl font-black text-slate-100 font-mono mt-1 block">
              {jerseys.filter(j => j.status === 'verified').length}
            </span>
          </Card>
          <Card className="p-6 bg-brand-navy-light/10 text-center">
            <Gavel className="text-brand-accent-red mx-auto mb-2" size={28} />
            <h3 className="font-bold text-slate-300 uppercase tracking-wider">Active Auctions</h3>
            <span className="text-3xl font-black text-slate-100 font-mono mt-1 block">
              {auctions.filter(a => a.status === 'live').length}
            </span>
          </Card>
        </div>
      )}

      {/* RENDER MY JERSEYS PAGE */}
      {activeTab === 'my-jerseys' && (
        <Card className="p-6 bg-brand-navy-light/10 border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-6 flex items-center">
            <Tag size={16} className="mr-2 text-brand-gold" />
            My Submitted Jerseys
          </h2>

          {jerseys.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No jerseys registered yet. Click "Add Jersey" to submit your first item.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="pb-3 pr-4">Jersey Details</th>
                    <th className="pb-3 px-4">Category</th>
                    <th className="pb-3 px-4">Specs</th>
                    <th className="pb-3 px-4">Permintaan Lelang</th>
                    <th className="pb-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jerseys.map(jersey => (
                    <tr key={jersey.id} className="text-slate-300">
                      <td className="py-4 pr-4 flex items-center space-x-3">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                          <img
                            src={getFullImgUrl(jersey.images?.[0]?.image_url)}
                            alt={jersey.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-slate-200 line-clamp-1">{jersey.title}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-brand-accent">{jersey.category_name}</td>
                      <td className="py-4 px-4 text-slate-400">
                        {jersey.player_name || '-'} | {jersey.club_name || '-'} ({jersey.season || '-'}) | Size: {jersey.size}
                      </td>
                      <td className="py-4 px-4 text-[10px] text-slate-400 min-w-[220px]">
                        <span className="block font-semibold">Mulai: {formatDateTime(jersey.auction_start_time)}</span>
                        <span className="block font-semibold">Berakhir: {formatDateTime(jersey.auction_end_time)}</span>
                        <span className="block font-mono text-brand-gold font-black mt-1">Awal: {formatPrice(jersey.auction_start_price)}</span>
                        <span className="block font-mono text-slate-300 font-black">Minimum: {formatPrice(jersey.reserve_price)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={getStatusVariant(jersey.status)}>
                          {jersey.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* RENDER MY AUCTIONS PAGE */}
      {activeTab === 'my-auctions' && (
        <Card className="p-6 bg-brand-navy-light/10 border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-6 flex items-center">
            <Gavel size={16} className="mr-2 text-brand-gold" />
            My Auction Schedule
          </h2>

          {auctions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No auctions created from your verified jerseys yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="pb-3 pr-4">Auction Item</th>
                    <th className="pb-3 px-4">Tanggal Mulai Lelang</th>
                    <th className="pb-3 px-4">Berakhir Lelang</th>
                    <th className="pb-3 px-4">Harga Awal Lelang</th>
                    <th className="pb-3 px-4">Harga Akhir Minimum</th>
                    <th className="pb-3 px-4">Hasil Akhir</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auctions.map(auction => (
                    <tr key={auction.id} className="text-slate-300">
                      <td className="py-4 pr-4 flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                          <img
                            src={getFullImgUrl(auction.main_image)}
                            alt={auction.jersey_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-slate-200 line-clamp-1">{auction.jersey_title}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                        {formatDateTime(auction.start_time)}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                        {formatDateTime(auction.end_time)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-brand-gold">
                        {formatPrice(auction.start_price)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                        {formatPrice(auction.reserve_price)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                        {formatAuctionFinalPrice(auction)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={auction.status}>{formatStatusLabel(auction.status)}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        {auction.status === 'negotiation' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleNegotiationDecision(auction.id, 'accepted')}
                              className="px-3 py-1.5 rounded-lg bg-brand-accent-green/15 text-brand-accent-green hover:bg-brand-accent-green/30 font-black text-[9px] uppercase tracking-wider"
                            >
                              Terima
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNegotiationDecision(auction.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg bg-brand-accent-red/15 text-brand-accent-red hover:bg-brand-accent-red/30 font-black text-[9px] uppercase tracking-wider"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-semibold">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* RENDER SALES PAGE */}
      {activeTab === 'sales' && (
        <Card className="p-6 bg-brand-navy-light/10 border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-6 flex items-center">
            <ShoppingBag size={16} className="mr-2 text-brand-gold" />
            Sales & Shipment Results
          </h2>

          {sales.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No completed or paid sales found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="pb-3 pr-4">Winning Item</th>
                    <th className="pb-3 px-4">Winner</th>
                    <th className="pb-3 px-4">Tanggal Mulai Lelang</th>
                    <th className="pb-3 px-4">Berakhir Lelang</th>
                    <th className="pb-3 px-4">Harga Awal Lelang</th>
                    <th className="pb-3 px-4">Harga Akhir Lelang</th>
                    <th className="pb-3 px-4">Delivery</th>
                    <th className="pb-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sales.map(sale => (
                    <tr key={sale.id} className="text-slate-300">
                      <td className="py-4 pr-4 font-bold text-slate-200 max-w-xs truncate">{sale.jersey_title}</td>
                      <td className="py-4 px-4 text-slate-400">{sale.winner_name}</td>
                      <td className="py-4 px-4 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                        {formatDateTime(sale.start_time)}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                        {formatDateTime(sale.end_time)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-brand-gold">{formatPrice(sale.start_price)}</td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-200">{formatPrice(sale.final_price)}</td>
                      <td className="py-4 px-4 text-[10px] text-slate-400">
                        <span className="block font-bold">{sale.courier || '-'}</span>
                        <span className="block font-mono">{sale.tracking_number || 'Tracking not assigned'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={sale.status === 'delivered' ? 'success' : sale.status === 'shipped' ? 'gold' : 'warning'}>
                          {sale.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* RENDER ADD JERSEY FORM PAGE */}
      {activeTab === 'add-jersey' && (
        <Card className="p-6 md:p-8 bg-brand-navy-light/10 border-slate-800 max-w-3xl mx-auto">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-6 flex items-center">
            <PlusCircle size={16} className="mr-2 text-brand-gold" />
            Add New Jersey to Catalog
          </h2>

          {error && (
            <div className="mb-4 p-3.5 bg-brand-accent-red/10 border border-brand-accent-red/35 rounded-xl text-center text-brand-accent-red font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 bg-brand-accent-green/10 border border-brand-accent-green/35 rounded-xl text-center text-brand-accent-green font-semibold">
              {success}
            </div>
          )}

          <form onSubmit={handleAddJerseySubmit} className="space-y-4">
            <Input
              label="Jersey Listing Title *"
              placeholder="e.g. Manchester United 2007-08 Home - Signed Cristiano Ronaldo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={formLoading}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={formLoading}
                  required
                  className="w-full px-4 py-3 bg-brand-navy-light text-slate-100 rounded-xl border border-slate-700/60 focus:outline-none focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/60"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Collectible Type
                </label>
                <select
                  value={jerseyType}
                  onChange={(e) => setJerseyType(e.target.value)}
                  disabled={formLoading}
                  className="w-full px-4 py-3 bg-brand-navy-light text-slate-100 rounded-xl border border-slate-700/60 focus:outline-none focus:border-brand-gold/60"
                >
                  <option value="classic-jersey">Classic / Vintage</option>
                  <option value="signed-jersey">Signed Collectible</option>
                  <option value="match-worn-jersey">Match Worn Jersey</option>
                  <option value="match-issued-jersey">Match Issued Jersey</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Player Name"
                placeholder="e.g. Cristiano Ronaldo"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={formLoading}
              />
              <Input
                label="Club / Team Name"
                placeholder="e.g. Manchester United"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                disabled={formLoading}
              />
              <Input
                label="League / Competition"
                placeholder="e.g. Premier League"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                disabled={formLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Season Years"
                placeholder="e.g. 2007-2008"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                disabled={formLoading}
              />
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  disabled={formLoading}
                  className="w-full px-4 py-3 bg-brand-navy-light text-slate-100 rounded-xl border border-slate-700/60 focus:outline-none"
                >
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Condition Rating
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  disabled={formLoading}
                  className="w-full px-4 py-3 bg-brand-navy-light text-slate-100 rounded-xl border border-slate-700/60 focus:outline-none"
                >
                  <option value="Mint">Mint (10/10)</option>
                  <option value="Excellent">Excellent (9/10)</option>
                  <option value="Very Good">Very Good (8/10)</option>
                  <option value="Good">Good (7/10)</option>
                  <option value="Fair">Fair / Worn (6/10)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
              <label className="flex items-center space-x-3 p-3 bg-brand-navy rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSigned}
                  onChange={(e) => setIsSigned(e.target.checked)}
                  disabled={formLoading}
                  className="rounded text-brand-gold focus:ring-brand-gold bg-slate-900 border-slate-800"
                />
                <span className="font-bold text-slate-350">Hand Signed Item</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-brand-navy rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCoa}
                  onChange={(e) => setHasCoa(e.target.checked)}
                  disabled={formLoading}
                  className="rounded text-brand-gold focus:ring-brand-gold bg-slate-900 border-slate-800"
                />
                <span className="font-bold text-slate-350">Includes COA Certificate</span>
              </label>
            </div>

            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Detailed Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={formLoading}
                placeholder="Details about matching matches, shirt details, autograph location, or collection history..."
                rows={4}
                className="w-full px-4 py-3 bg-brand-navy-light text-slate-100 placeholder-slate-650 rounded-xl border border-slate-700/60 focus:outline-none focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/60"
              />
            </div>

            <div className="pt-3 border-t border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4">
                Auction Request
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tanggal Mulai Lelang *"
                  type="datetime-local"
                  value={auctionStartTime}
                  onChange={(e) => setAuctionStartTime(e.target.value)}
                  disabled={formLoading}
                  required
                />
                <Input
                  label="Berakhir Lelang *"
                  type="datetime-local"
                  value={auctionEndTime}
                  onChange={(e) => setAuctionEndTime(e.target.value)}
                  disabled={formLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Harga Awal Lelang (Rp) *"
                  type="number"
                  min="1000"
                  step="1000"
                  placeholder="e.g. 5000000"
                  value={auctionStartPrice}
                  onChange={(e) => setAuctionStartPrice(e.target.value)}
                  disabled={formLoading}
                  required
                />
                <Input
                  label="Harga Akhir Minimum (Rp) *"
                  type="number"
                  min="1000"
                  step="1000"
                  placeholder="e.g. 7500000"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  disabled={formLoading}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Jersey Photos (Up to 5 files) *
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImageFiles(e.target.files)}
                disabled={formLoading}
                className="w-full bg-brand-navy p-4 rounded-xl border border-slate-800 text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-brand-gold file:text-brand-navy file:cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              fullWidth
              loading={formLoading}
              className="py-3 uppercase font-black tracking-widest text-xs mt-6"
            >
              Submit Jersey Listing
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
export default SellerDashboardPage;
