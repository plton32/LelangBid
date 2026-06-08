import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Gavel, Award, Truck, AlertCircle, Sparkles, Upload } from 'lucide-react';

interface WinningRecord {
  id: string;
  auction_id: string;
  jersey_title: string;
  jersey_id: string;
  main_image: string;
  final_price: number;
  status: 'waiting_payment' | 'waiting_verification' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  payment_deadline: string;
  courier?: string;
  tracking_number?: string;
  shipment_status?: string;
}

export const UserDashboardPage: React.FC = () => {
  const [winnings, setWinnings] = useState<WinningRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload proof modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<WinningRecord | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [address, setAddress] = useState('');
  const [courier, setCourier] = useState('JNE Reguler');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDashboardData = async () => {
    try {
      const winRes = await api.get('/notifications/winnings');
      setWinnings(winRes.data);

      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openUploadModal = (winner: WinningRecord) => {
    setSelectedWinner(winner);
    setRecipientName('');
    setAddress('');
    setCourier('JNE Reguler');
    setProofFile(null);
    setError('');
    setSuccess('');
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner || !proofFile) {
      setError('Please select a payment proof screenshot');
      return;
    }

    setUploadLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('winnerId', selectedWinner.id);
      formData.append('amount', String(selectedWinner.final_price));
      formData.append('recipientName', recipientName);
      formData.append('address', address);
      formData.append('courier', courier);
      formData.append('proof', proofFile);

      await api.post('/payments/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Payment receipt uploaded successfully! Waiting for admin review.');
      setTimeout(() => {
        setUploadModalOpen(false);
        fetchDashboardData();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error uploading proof. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  const getFullImgUrl = (url: string) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : defaultPlaceholder;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Welcomes User */}
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-premium border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100">Collector Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage your winning jersey bids, upload receipts, and check delivery status.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Winnings Listing (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-350 flex items-center">
            <Award className="mr-2 text-brand-gold" size={18} />
            My Winning Auctions
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-brand-navy-light/10 border border-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : winnings.length === 0 ? (
            <Card className="text-center py-16 bg-brand-navy-light/10">
              <Gavel className="text-slate-600 mx-auto mb-3" size={32} />
              <p className="text-slate-400 font-bold">No won auctions yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-5">Participate in live jersey auctions to claim items!</p>
              <a href="/auctions?status=live" className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-navy gold-gradient-bg">
                Explore Catalog
              </a>
            </Card>
          ) : (
            <div className="space-y-4">
              {winnings.map(win => {
                const isWaitingPay = win.status === 'waiting_payment';
                const isPendingVerif = win.status === 'waiting_verification';
                const isPaid = win.status === 'paid';
                const isShipped = win.status === 'shipped';
                const isCompleted = win.status === 'completed';

                return (
                  <Card key={win.id} className="bg-brand-navy-light/15 border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {/* Image Thumbnail */}
                      <div className="w-20 h-20 aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                        <img
                          src={getFullImgUrl(win.main_image)}
                          alt={win.jersey_title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info details */}
                      <div>
                        <h3 className="font-bold text-slate-200 text-xs sm:text-sm line-clamp-1">
                          {win.jersey_title}
                        </h3>
                        <p className="text-xs text-slate-450 mt-1 font-mono font-bold">
                          Winning Bid: <span className="text-brand-gold">{formatPrice(win.final_price)}</span>
                        </p>
                        
                        {/* Shipping detail status */}
                        {(isShipped || isCompleted) && win.tracking_number && (
                          <div className="mt-2 p-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>📦 Delivery: {win.courier} ({win.tracking_number})</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold text-[9px]">
                              {win.shipment_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Block */}
                    <div className="flex flex-col items-start sm:items-end space-y-2 shrink-0">
                      <Badge variant={
                        isWaitingPay ? 'warning' :
                        isPendingVerif ? 'info' :
                        isPaid ? 'success' :
                        isShipped ? 'gold' :
                        isCompleted ? 'success' : 'closed'
                      }>
                        {win.status.replace(/_/g, ' ')}
                      </Badge>

                      {isWaitingPay && (
                        <Button
                          onClick={() => openUploadModal(win)}
                          variant="gold"
                          className="py-1.5 px-3 rounded-lg text-[10px] uppercase font-black tracking-widest mt-1.5 flex items-center"
                        >
                          <Upload size={12} className="mr-1.5" /> Upload Receipt
                        </Button>
                      )}

                      {isWaitingPay && win.payment_deadline && (
                        <span className="text-[10px] text-brand-accent-red font-semibold">
                          Pay by: {new Date(win.payment_deadline).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Quick Notifications box (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-350">Alerts Box</h2>
          
          <Card className="bg-brand-navy-light/10 border-slate-800 p-5 rounded-2xl">
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No notifications yet.</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="pb-3.5 border-b border-slate-850/60 last:border-b-0 last:pb-0">
                    <span className="block text-xs font-extrabold text-brand-gold uppercase tracking-wide">
                      {notif.title}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-slate-500 block mt-1">
                      {new Date(notif.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Upload Payment Proof Modal */}
      {selectedWinner && (
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title="Upload Payment Transfer Proof"
        >
          {error && (
            <div className="mb-4 p-3 bg-brand-accent-red/10 border border-brand-accent-red/30 rounded-xl text-center text-xs text-brand-accent-red font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-brand-accent-green/10 border border-brand-accent-green/30 rounded-xl text-center text-xs text-brand-accent-green font-semibold">
              {success}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl mb-4">
              <span className="text-slate-500 uppercase tracking-wider font-semibold block text-[10px]">Jersey Title</span>
              <span className="text-slate-200 font-bold block text-sm mt-0.5">{selectedWinner.jersey_title}</span>
              
              <span className="text-slate-500 uppercase tracking-wider font-semibold block text-[10px] mt-2">Total Transfer Required</span>
              <span className="text-brand-gold font-mono font-black block text-sm mt-0.5">
                {formatPrice(selectedWinner.final_price)}
              </span>
            </div>

            <Input
              label="Recipient Full Name *"
              placeholder="e.g. Ahmad Junaidi"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={uploadLoading}
              required
            />

            <div className="flex flex-col mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Shipping Destination Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={uploadLoading}
                placeholder="e.g. Jl. Menteng Raya No. 45, Jakarta Pusat"
                className="w-full px-4 py-3 bg-brand-navy text-slate-100 placeholder-slate-600 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50"
                rows={3}
                required
              />
            </div>

            <div className="flex flex-col mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Courier Service Selection
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                disabled={uploadLoading}
                className="w-full px-4 py-3 bg-brand-navy text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-gold/50"
              >
                <option value="JNE Reguler">JNE Reguler (15.000)</option>
                <option value="J&T Express">J&T Express (14.000)</option>
                <option value="Sicepat Reguler">Sicepat Reguler (13.000)</option>
                <option value="GoSend / GrabExpress">Instant Delivery (35.000)</option>
              </select>
            </div>

            <div className="flex flex-col mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Transfer Receipt Image (JPEG/PNG) *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setProofFile(e.target.files[0]);
                  }
                }}
                disabled={uploadLoading}
                required
                className="w-full bg-brand-navy p-3 rounded-xl border border-slate-800 text-slate-400 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-brand-gold file:text-brand-navy file:cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              fullWidth
              loading={uploadLoading}
              className="py-3 uppercase font-black tracking-widest text-xs mt-6"
            >
              Upload Proof & Address
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default UserDashboardPage;
