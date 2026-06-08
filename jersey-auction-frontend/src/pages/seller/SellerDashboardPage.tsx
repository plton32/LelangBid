import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Tag, PlusCircle, LayoutDashboard, ShoppingBag, Sparkles, Plus, Upload, Gavel } from 'lucide-react';

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
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected';
  images: any[];
}

export const SellerDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-jerseys' | 'add-jersey'>('dashboard');
  const [jerseys, setJerseys] = useState<JerseyData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Error fetching seller details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, []);

  const handleAddJerseySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId) {
      setError('Title and Category are required');
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

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  const getFullImgUrl = (url: string) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : defaultPlaceholder;
  };

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
            <p className="text-[11px] text-slate-400 mt-0.5">Manage your memorabilia shop, upload new listings, and trace approvals.</p>
          </div>
        </div>

        {/* Actions shortcut tabs */}
        <div className="flex space-x-2 bg-brand-navy p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-4 rounded-lg font-bold uppercase transition-all ${
              activeTab === 'dashboard' ? 'gold-gradient-bg text-brand-navy shadow-sm' : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('my-jerseys')}
            className={`py-2 px-4 rounded-lg font-bold uppercase transition-all ${
              activeTab === 'my-jerseys' ? 'gold-gradient-bg text-brand-navy shadow-sm' : 'text-slate-455 hover:text-slate-200'
            }`}
          >
            My Jerseys ({jerseys.length})
          </button>
          <button
            onClick={() => setActiveTab('add-jersey')}
            className={`py-2 px-4 rounded-lg font-bold uppercase transition-all flex items-center space-x-1 ${
              activeTab === 'add-jersey' ? 'gold-gradient-bg text-brand-navy shadow-sm' : 'text-slate-455 hover:text-slate-200'
            }`}
          >
            <Plus size={12} />
            <span>Add Jersey</span>
          </button>
        </div>
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
