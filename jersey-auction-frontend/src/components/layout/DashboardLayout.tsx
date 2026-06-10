import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Tag, 
  Gavel, 
  Users, 
  CreditCard, 
  Truck, 
  Award, 
  PlusCircle, 
  ShoppingBag, 
  LogOut, 
  ArrowLeft,
  Store
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout, isAdmin, isSeller } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getSidebarLinks = () => {
    if (isAdmin) {
      return [
        { label: 'Stats Overview', path: '/admin', icon: <LayoutDashboard size={16} /> },
        { label: 'Manage Users', path: '/admin/users', icon: <Users size={16} /> },
        { label: 'Seller Requests', path: '/admin/seller-applications', icon: <Store size={16} /> },
        { label: 'Verifikasi Jersey', path: '/admin/jerseys', icon: <Tag size={16} /> },
        { label: 'Manage Auctions', path: '/admin/auctions', icon: <Gavel size={16} /> },
        { label: 'Verify Deposits', path: '/admin/deposits', icon: <CreditCard size={16} /> },
        { label: 'Verify Payments', path: '/admin/payments', icon: <CreditCard size={16} /> },
        { label: 'Input Shipments', path: '/admin/shipments', icon: <Truck size={16} /> },
        { label: 'Issue COA', path: '/admin/certificates', icon: <Award size={16} /> },
      ];
    }

    if (isSeller) {
      return [
        { label: 'Seller Dashboard', path: '/seller', icon: <LayoutDashboard size={16} /> },
        { label: 'Tambah Jersey', path: '/seller/add-jersey', icon: <PlusCircle size={16} /> },
        { label: 'Jersey Saya', path: '/seller/jerseys', icon: <Tag size={16} /> },
        { label: 'Lelang Saya', path: '/seller/auctions', icon: <Gavel size={16} /> },
        { label: 'Hasil Penjualan', path: '/seller/sales', icon: <ShoppingBag size={16} /> },
      ];
    }

    // Default Member
    return [
      { label: 'My Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
      { label: 'Menang Lelang', path: '/dashboard/winnings', icon: <Award size={16} /> },
      { label: 'My Shipments', path: '/dashboard/shipments', icon: <Truck size={16} /> },
    ];
  };

  const menuLinks = getSidebarLinks();

  return (
    <div className="min-h-screen bg-brand-navy-deep text-slate-200 flex flex-col md:flex-row">
      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 bg-black border-r border-brand-accent-red/25 p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Brand */}
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Gavel className="text-brand-gold h-5 w-5" />
              <span className="font-extrabold tracking-wider uppercase text-slate-100 text-sm">
                Lelang<span className="gold-gradient-text">BID</span>
              </span>
            </Link>
            
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 flex items-center">
              <ArrowLeft size={12} className="mr-1" /> Public
            </Link>
          </div>

          {/* User Meta Card */}
          <div className="mb-6 p-4 rounded-xl bg-brand-navy-light/60 border border-brand-accent-red/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Logged In As</span>
            <span className="font-bold text-slate-100 block truncate text-sm mt-0.5">{user?.fullName}</span>
            <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black uppercase rounded gold-gradient-bg text-brand-navy">
              {user?.role}
            </span>
          </div>

          {/* Nav Menu Links */}
          <nav className="space-y-1">
            {menuLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'gold-gradient-bg text-brand-navy shadow-premium-glow'
                      : 'text-slate-400 hover:text-white hover:bg-brand-accent-red/10'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Log out */}
        <div className="mt-8 pt-4 border-t border-brand-accent-red/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-brand-accent-red hover:bg-brand-accent-red/10 transition-all focus:outline-none"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
export default DashboardLayout;
