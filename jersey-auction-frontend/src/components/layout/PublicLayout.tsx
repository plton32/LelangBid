import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Gavel, Bell, User as UserIcon, LogOut, Menu, X } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export const PublicLayout: React.FC = () => {
  const { user, logout, isAuthenticated, isAdmin, isSeller } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll notifications every 30s
    let interval: any;
    if (isAuthenticated) {
      interval = setInterval(fetchNotifications, 30000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    // Close dropdowns on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin';
    if (isSeller) return '/seller';
    return '/dashboard';
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Live Auctions', path: '/auctions?status=live' },
    { label: 'Upcoming', path: '/auctions?status=upcoming' },
    { label: 'COA Verify', path: '/verify' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-navy-deep text-slate-200">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-black border-b border-brand-accent-red/25 shadow-premium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Gavel className="text-brand-gold h-7 w-7" />
                <span className="font-extrabold text-lg md:text-xl tracking-wider uppercase text-slate-100 font-sans">
                  Lelang<span className="gold-gradient-text">BID</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map(link => {
                const isActive = location.pathname + location.search === link.path || 
                                 (link.path !== '/' && location.pathname.startsWith(link.path.split('?')[0]));
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    className={`text-xs font-black uppercase tracking-wider transition-colors duration-200 ${
                      isActive ? 'text-brand-gold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Session Links & Utilities */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Notification Dropdown Container */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                      className="relative p-2 text-slate-400 hover:text-brand-accent-red focus:outline-none transition-colors"
                    >
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none text-brand-navy gold-gradient-bg">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {notifDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-80 bg-brand-navy-light/95 border border-brand-accent-red/25 rounded-2xl shadow-2xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Notifications</span>
                          {unreadCount > 0 && <span className="text-[10px] font-bold text-brand-accent-red">{unreadCount} unread</span>}
                        </div>

                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">No alerts found.</div>
                          ) : (
                            notifications.map(notif => (
                              <div
                                key={notif.id}
                                className={`p-4 transition-colors ${notif.is_read === 0 ? 'bg-brand-gold/5' : ''}`}
                                onClick={() => notif.is_read === 0 && handleMarkAsRead(notif.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold ${notif.is_read === 0 ? 'text-brand-gold' : 'text-slate-300'}`}>
                                    {notif.title}
                                  </span>
                                  {notif.is_read === 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                                <span className="text-[9px] text-slate-500 block mt-1.5">
                                  {new Date(notif.created_at).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dashboard link */}
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center space-x-1.5 py-2 px-4 border border-brand-accent-red/25 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-brand-accent-red/55 transition-all"
                  >
                    <UserIcon size={14} />
                    <span>Dashboard</span>
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-brand-accent-red transition-colors focus:outline-none"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-slate-200">
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-brand-navy gold-gradient-bg hover:brightness-110 transition-all duration-200"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black border-b border-brand-accent-red/25 px-4 pt-2 pb-4 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-slate-300 hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-bold text-brand-gold"
                  >
                    Dashboard ({user?.fullName})
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-brand-accent-red"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 bg-slate-800 text-xs font-bold text-slate-300 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 gold-gradient-bg text-brand-navy text-xs font-bold rounded-xl"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-brand-accent-red/20 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Gavel className="text-brand-gold h-5 w-5" />
            <span className="font-extrabold uppercase text-slate-400">
              Lelang<span className="text-brand-gold">BID</span>
            </span>
            <span>© 2026 LelangBID jersey marketplace. All Rights Reserved.</span>
          </div>

          <div className="flex space-x-6">
            <span className="hover:text-slate-300 transition-colors">Original LelangBid</span>
            <span className="hover:text-slate-300 transition-colors">COA Verified</span>
            <span className="hover:text-slate-300 transition-colors">Secure Escrow</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default PublicLayout;
