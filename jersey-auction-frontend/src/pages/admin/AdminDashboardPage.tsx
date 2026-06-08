import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { 
  LayoutDashboard, Users, Tag, Gavel, 
  CreditCard, Truck, Award, FileSpreadsheet,
  Check, X, Plus, Eye, Download
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'verify-jerseys' | 'auctions' | 'payments' | 'shipments' | 'coa'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [jerseys, setJerseys] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal actions states
  const [createAuctionOpen, setCreateAuctionOpen] = useState(false);
  const [verifiedJerseys, setVerifiedJerseys] = useState<any[]>([]);
  const [selectedJerseyId, setSelectedJerseyId] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('50000');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // COA Creation states
  const [createCoaOpen, setCreateCoaOpen] = useState(false);
  const [verifierName, setVerifierName] = useState('LelangBID Verification Team');
  const [customCoaNumber, setCustomCoaNumber] = useState('');

  // Payment proof image modal state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [activeProofUrl, setActiveProofUrl] = useState('');

  // Form loading states
  const [formLoading, setFormLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data);

      // Jerseys list for verification
      const jerseysRes = await api.get('/jerseys?status=pending_verification');
      setJerseys(jerseysRes.data);

      // All verified jerseys (available for auction or COA creation)
      const allJerseysRes = await api.get('/jerseys');
      const verified = allJerseysRes.data.filter((j: any) => j.status === 'verified');
      setVerifiedJerseys(verified);

      // Auctions list
      const auctionsRes = await api.get('/auctions');
      setAuctions(auctionsRes.data);

      // Payments list
      const paymentsRes = await api.get('/payments');
      setPayments(paymentsRes.data);

      // Shipments list
      const shipmentsRes = await api.get('/shipments');
      setShipments(shipmentsRes.data);

      // COA list
      const coaRes = await api.get('/certificates');
      setCertificates(coaRes.data);
    } catch (err) {
      console.error('Error fetching admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  // Actions handlers
  const handleUserRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      fetchAdminData();
    } catch (err) {
      alert('Error updating user role');
    }
  };

  const handleUserStatusToggle = async (userId: string, currentStatus: string) => {
    const status = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/users/${userId}`, { status });
      fetchAdminData();
    } catch (err) {
      alert('Error toggling user status');
    }
  };

  const handleJerseyVerify = async (jerseyId: string, status: 'verified' | 'rejected') => {
    try {
      await api.patch(`/admin/jerseys/${jerseyId}/verify`, { status });
      fetchAdminData();
    } catch (err) {
      alert('Error approving jersey');
    }
  };

  const handleCreateAuctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJerseyId || !startPrice || !startTime || !endTime) {
      alert('Please fill in all fields');
      return;
    }

    setFormLoading(true);
    try {
      await api.post('/auctions', {
        jerseyId: selectedJerseyId,
        startPrice: Number(startPrice),
        minIncrement: Number(minIncrement),
        startTime,
        endTime
      });

      setCreateAuctionOpen(false);
      setSelectedJerseyId('');
      setStartPrice('');
      setStartTime('');
      setEndTime('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating auction');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, status: 'verified' | 'rejected') => {
    try {
      await api.patch(`/payments/${paymentId}/verify`, { status });
      fetchAdminData();
    } catch (err) {
      alert('Error verifying payment');
    }
  };

  const handleShipItem = async (shipmentId: string, courier: string, resi: string) => {
    if (!resi) {
      alert('Please enter a tracking number / resi');
      return;
    }

    try {
      await api.patch(`/shipments/${shipmentId}`, {
        courier,
        trackingNumber: resi,
        status: 'shipped'
      });
      fetchAdminData();
    } catch (err) {
      alert('Error updating shipment status');
    }
  };

  const handleCreateCoaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJerseyId || !verifierName) {
      alert('Please fill in required fields');
      return;
    }

    setFormLoading(true);
    try {
      await api.post('/certificates', {
        jerseyId: selectedJerseyId,
        verifierName,
        coaNumber: customCoaNumber || undefined
      });

      setCreateCoaOpen(false);
      setSelectedJerseyId('');
      setCustomCoaNumber('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error generating COA certificate');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownloadReport = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('lelangbid_token');
    window.open(`${API_URL}/admin/reports/csv?token=${token}`, '_blank');
  };

  const getFullImgUrl = (url: string) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-gold mb-3"></div>
        Syncing admin records...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs font-sans">
      
      {/* Admin Quick stats panels */}
      {activeTab === 'dashboard' && stats && (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-gradient-premium border border-slate-800 rounded-3xl shadow-xl mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100">Superadmin Panel</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Global operations management, approval queues, and transaction audits.</p>
            </div>
            
            <button
              onClick={handleDownloadReport}
              className="mt-4 sm:mt-0 flex items-center space-x-2 py-3 px-5 rounded-xl font-black text-[11px] uppercase tracking-wider text-brand-navy gold-gradient-bg shadow-premium-glow hover:shadow-premium-glow-heavy transition-all duration-350"
            >
              <Download size={14} />
              <span>Export CSV Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-brand-navy-light/10 text-center">
              <Users className="text-brand-gold mx-auto mb-1" size={24} />
              <h4 className="text-[10px] text-slate-500 font-bold uppercase">Users Total</h4>
              <span className="text-xl font-black text-slate-100 font-mono block mt-1">{stats.totalUsers}</span>
            </Card>
            <Card className="p-4 bg-brand-navy-light/10 text-center">
              <Tag className="text-brand-accent mx-auto mb-1" size={24} />
              <h4 className="text-[10px] text-slate-500 font-bold uppercase">Jerseys Total</h4>
              <span className="text-xl font-black text-slate-100 font-mono block mt-1">{stats.totalJerseys}</span>
            </Card>
            <Card className="p-4 bg-brand-navy-light/10 text-center">
              <Gavel className="text-brand-accent-red mx-auto mb-1" size={24} />
              <h4 className="text-[10px] text-slate-500 font-bold uppercase">Live Auctions</h4>
              <span className="text-xl font-black text-slate-100 font-mono block mt-1">{stats.activeAuctions}</span>
            </Card>
            <Card className="p-4 bg-brand-navy-light/10 text-center">
              <CreditCard className="text-brand-accent-green mx-auto mb-1" size={24} />
              <h4 className="text-[10px] text-slate-500 font-bold uppercase">Total Revenue</h4>
              <span className="text-xl font-black text-slate-100 font-mono block mt-1">{formatPrice(stats.totalRevenue)}</span>
            </Card>
          </div>
        </>
      )}

      {/* Main Tabs Navigation Bar */}
      <div className="flex bg-brand-navy border border-slate-800 p-1 rounded-2xl overflow-x-auto max-w-full space-x-1">
        {[
          { id: 'dashboard', label: 'Stats Overview', icon: <LayoutDashboard size={14} /> },
          { id: 'users', label: 'Users', icon: <Users size={14} /> },
          { id: 'verify-jerseys', label: 'Verifikasi Jersey', icon: <Tag size={14} /> },
          { id: 'auctions', label: 'Auctions', icon: <Gavel size={14} /> },
          { id: 'payments', label: 'Verify Payments', icon: <CreditCard size={14} /> },
          { id: 'shipments', label: 'Shipments', icon: <Truck size={14} /> },
          { id: 'coa', label: 'COA Certs', icon: <Award size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setLoading(true);
            }}
            className={`flex items-center space-x-2 shrink-0 py-2.5 px-4 rounded-xl font-bold uppercase transition-all duration-200 ${
              activeTab === tab.id 
                ? 'gold-gradient-bg text-brand-navy font-extrabold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-brand-navy-light/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <h3 className="font-bold text-slate-200 text-sm mb-4 uppercase tracking-wide">Manage Registered Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">Full Name</th>
                  <th className="pb-3 px-4">Email</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3.5 pr-4 font-bold text-slate-250">{u.full_name}</td>
                    <td className="py-3.5 px-4 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4 uppercase text-brand-accent font-semibold">{u.role}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'active' ? 'success' : 'closed'}>{u.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 flex items-center space-x-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                        className="bg-brand-navy border border-slate-800 text-[10px] py-1 px-2 rounded focus:outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="seller">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        onClick={() => handleUserStatusToggle(u.id, u.status)}
                        className={`font-black uppercase tracking-wider text-[9px] px-2 py-1 rounded transition-colors ${
                          u.status === 'active' 
                            ? 'bg-brand-accent-red/15 text-brand-accent-red hover:bg-brand-accent-red/30' 
                            : 'bg-brand-accent-green/15 text-brand-accent-green hover:bg-brand-accent-green/30'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. JERSEY VERIFICATION TAB */}
      {activeTab === 'verify-jerseys' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <h3 className="font-bold text-slate-200 text-sm mb-4 uppercase tracking-wide">Pending Jersey Verification</h3>
          
          {jerseys.length === 0 ? (
            <p className="text-center py-6 text-slate-500 font-bold">No jersey listings pending verification.</p>
          ) : (
            <div className="space-y-4">
              {jerseys.map(jersey => (
                <div key={jersey.id} className="p-4 bg-brand-navy border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                      <img
                        src={getFullImgUrl(jersey.images?.[0]?.image_url)}
                        alt={jersey.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs sm:text-sm">{jersey.title}</h4>
                      <p className="text-[10px] text-slate-450 mt-1 font-semibold uppercase tracking-wider">
                        Store Owner: {jersey.seller_name} | Category: {jersey.category_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">
                        Specs: Size {jersey.size} | Cond: {jersey.condition} | Type: {jersey.jersey_type?.replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleJerseyVerify(jersey.id, 'verified')}
                      className="p-2 bg-brand-accent-green/15 text-brand-accent-green hover:bg-brand-accent-green/30 rounded-lg transition-colors flex items-center space-x-1"
                      title="Approve Listing"
                    >
                      <Check size={16} />
                      <span className="text-[9px] font-black uppercase pr-1.5 pl-0.5">Approve</span>
                    </button>
                    <button
                      onClick={() => handleJerseyVerify(jersey.id, 'rejected')}
                      className="p-2 bg-brand-accent-red/15 text-brand-accent-red hover:bg-brand-accent-red/30 rounded-lg transition-colors flex items-center space-x-1"
                      title="Reject Listing"
                    >
                      <X size={16} />
                      <span className="text-[9px] font-black uppercase pr-1.5 pl-0.5">Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. AUCTIONS MANAGEMENT TAB */}
      {activeTab === 'auctions' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Manage Auctions Catalog</h3>
            <Button
              onClick={() => setCreateAuctionOpen(true)}
              variant="gold"
              className="py-2 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center space-x-1"
            >
              <Plus size={12} />
              <span>Create Auction</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">Jersey Memorabilia</th>
                  <th className="pb-3 px-4">Pricing</th>
                  <th className="pb-3 px-4">Timing Details</th>
                  <th className="pb-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350">
                {auctions.map(a => (
                  <tr key={a.id}>
                    <td className="py-3 pr-4 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-850 shrink-0">
                        <img
                          src={getFullImgUrl(a.main_image)}
                          alt={a.jersey_title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-bold text-slate-200 truncate max-w-xs block">{a.jersey_title}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className="block text-[10px] text-slate-500">Current: {formatPrice(a.current_price)}</span>
                      <span className="block text-[9px] text-slate-650">Inc: +{formatPrice(a.min_increment)}</span>
                    </td>
                    <td className="py-3 px-4 text-[10px] font-bold">
                      <span className="block text-slate-400">Start: {new Date(a.start_time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="block text-slate-400">End: {new Date(a.end_time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.status}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. PAYMENT VERIFICATION TAB */}
      {activeTab === 'payments' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <h3 className="font-bold text-slate-200 text-sm mb-4 uppercase tracking-wide">Verify Transfer Receipts</h3>
          
          {payments.length === 0 ? (
            <p className="text-center py-6 text-slate-500 font-bold">No payments registered in system.</p>
          ) : (
            <div className="space-y-4">
              {payments.map(p => (
                <div key={p.id} className="p-4 bg-brand-navy border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {/* Receipts Proof Preview thumbnail */}
                    {p.proof_image_url && (
                      <button
                        onClick={() => {
                          setActiveProofUrl(p.proof_image_url);
                          setProofModalOpen(true);
                        }}
                        className="w-14 h-14 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 hover:scale-105 transition-transform relative flex items-center justify-center group"
                      >
                        <img
                          src={getFullImgUrl(p.proof_image_url)}
                          alt="Proof"
                          className="w-full h-full object-cover group-hover:opacity-70"
                        />
                        <Eye size={14} className="absolute text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs sm:text-sm">{p.jersey_title}</h4>
                      <p className="text-[10px] text-slate-450 mt-1 font-semibold uppercase tracking-wider">
                        Winner Bidder: {p.user_name} | Amount Transferred: <span className="text-brand-gold font-mono font-black">{formatPrice(p.amount)}</span>
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Uploaded Date: {new Date(p.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Badge variant={p.status === 'verified' ? 'success' : p.status === 'pending_verification' ? 'warning' : 'closed'} className="mr-3">
                      {p.status}
                    </Badge>

                    {p.status === 'pending_verification' && (
                      <>
                        <button
                          onClick={() => handleVerifyPayment(p.id, 'verified')}
                          className="p-2 bg-brand-accent-green/15 text-brand-accent-green hover:bg-brand-accent-green/30 rounded-lg transition-colors flex items-center"
                          title="Confirm Verified"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(p.id, 'rejected')}
                          className="p-2 bg-brand-accent-red/15 text-brand-accent-red hover:bg-brand-accent-red/30 rounded-lg transition-colors flex items-center"
                          title="Reject Proof"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. SHIPMENTS VERIFICATION TAB */}
      {activeTab === 'shipments' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <h3 className="font-bold text-slate-200 text-sm mb-4 uppercase tracking-wide">Logistics & Shipments Resi</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">Winning Item</th>
                  <th className="pb-3 px-4">Recipient Details</th>
                  <th className="pb-3 px-4">Logistics</th>
                  <th className="pb-3 px-4">Actions / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350">
                {shipments.map(s => {
                  const isPending = s.status === 'pending';
                  return (
                    <tr key={s.id}>
                      <td className="py-3.5 pr-4">
                        <span className="font-bold text-slate-250 block max-w-xs truncate">{s.jersey_title}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">Winner: {s.winner_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[10px] leading-relaxed">
                        <span className="block font-bold text-slate-300">Name: {s.recipient_name}</span>
                        <span className="block text-slate-450">Address: {s.address}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-brand-accent">{s.courier}</td>
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              id={`resi-${s.id}`}
                              placeholder="Input Resi / Tracking No."
                              className="bg-brand-navy border border-slate-800 px-3 py-1 rounded text-[10px] font-mono text-slate-200 focus:outline-none"
                            />
                            <Button
                              onClick={() => {
                                const input = document.getElementById(`resi-${s.id}`) as HTMLInputElement;
                                handleShipItem(s.id, s.courier, input?.value);
                              }}
                              variant="gold"
                              className="py-1 px-3.5 text-[9px] rounded-lg uppercase tracking-widest font-black"
                            >
                              Ship Item
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start space-y-1">
                            <Badge variant="success">Shipped</Badge>
                            <span className="text-[10px] text-slate-500 font-mono">Resi: {s.tracking_number}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. COA CERTIFICATES MANAGEMENT TAB */}
      {activeTab === 'coa' && (
        <Card className="p-5 bg-brand-navy-light/15 border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Certificate of Authenticity (COA) Registry</h3>
            <Button
              onClick={() => setCreateCoaOpen(true)}
              variant="gold"
              className="py-2 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center space-x-1"
            >
              <Plus size={12} />
              <span>Issue Certificate</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">COA Number</th>
                  <th className="pb-3 px-4">Certified Jersey</th>
                  <th className="pb-3 px-4">Verifier Officer</th>
                  <th className="pb-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350">
                {certificates.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-mono font-black text-slate-200">{c.coa_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-300">{c.jersey_title}</td>
                    <td className="py-3 px-4 text-slate-400">{c.verifier_name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={c.status === 'valid' ? 'success' : 'closed'}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: CREATE AUCTION */}
      <Modal
        isOpen={createAuctionOpen}
        onClose={() => setCreateAuctionOpen(false)}
        title="Create New Auction Listing"
      >
        <form onSubmit={handleCreateAuctionSubmit} className="space-y-4 text-xs font-sans">
          <div className="flex flex-col mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Verified Jersey *
            </label>
            <select
              value={selectedJerseyId}
              onChange={(e) => setSelectedJerseyId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-brand-navy text-slate-100 rounded-xl border border-slate-800 focus:outline-none"
            >
              <option value="">Select Verified Jersey</option>
              {verifiedJerseys.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} (Seller: {j.seller_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Starting Price (Rp) *"
              type="number"
              placeholder="e.g. 5000000"
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
              required
            />
            <Input
              label="Minimum Increment (Rp) *"
              type="number"
              placeholder="e.g. 50000"
              value={minIncrement}
              onChange={(e) => setMinIncrement(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time *"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Date & Time *"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="gold"
            fullWidth
            loading={formLoading}
            className="py-3 uppercase tracking-widest text-xs font-black mt-6"
          >
            Deploy Auction Schedule
          </Button>
        </form>
      </Modal>

      {/* MODAL: CREATE COA CERTIFICATE */}
      <Modal
        isOpen={createCoaOpen}
        onClose={() => setCreateCoaOpen(false)}
        title="Issue Certificate of Authenticity (COA)"
      >
        <form onSubmit={handleCreateCoaSubmit} className="space-y-4 text-xs font-sans">
          <div className="flex flex-col mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Certified Jersey *
            </label>
            <select
              value={selectedJerseyId}
              onChange={(e) => setSelectedJerseyId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-brand-navy text-slate-100 rounded-xl border border-slate-800 focus:outline-none"
            >
              <option value="">Select Verified Jersey</option>
              {verifiedJerseys.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} (Seller: {j.seller_name})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Verifier Organization / Name *"
            value={verifierName}
            onChange={(e) => setVerifierName(e.target.value)}
            required
          />

          <Input
            label="Custom COA Number (Leave blank to generate automatically)"
            placeholder="e.g. COA-ZIDANE-RM02-555"
            value={customCoaNumber}
            onChange={(e) => setCustomCoaNumber(e.target.value)}
          />

          <Button
            type="submit"
            variant="gold"
            fullWidth
            loading={formLoading}
            className="py-3 uppercase tracking-widest text-xs font-black mt-6"
          >
            Issue Authentic Certificate
          </Button>
        </form>
      </Modal>

      {/* MODAL: EXPAND TRANSFER RECEIPT PROOF IMAGE */}
      {proofModalOpen && (
        <Modal
          isOpen={proofModalOpen}
          onClose={() => setProofModalOpen(false)}
          title="Payment Receipt Verification Proof"
          size="lg"
        >
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex justify-center items-center">
            <img
              src={getFullImgUrl(activeProofUrl)}
              alt="Verification Proof"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </Modal>
      )}

    </div>
  );
};
export default AdminDashboardPage;
