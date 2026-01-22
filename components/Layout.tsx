import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { User, Announcement } from '../types';
import { Menu, X, Newspaper, User as UserIcon, LogOut, Wallet, ShieldCheck, LogIn } from 'lucide-react';
import { Logo } from './Logo';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      // Syncs local session with remote DB in background
      DB.refreshSession()
        .then(updatedUser => {
           if(updatedUser) setUser(updatedUser);
        })
        .catch(err => console.error("Session refresh error:", err));

      // Immediately set what we have in storage for UI speed
      setUser(DB.getCurrentUser());
    };

    const loadAnnouncements = async () => {
      try {
        const data = await DB.getAnnouncements();
        setAnnouncements(data.filter(a => a.active));
      } catch (e) {
        console.error("Failed to load announcements", e);
      }
    };

    loadUser();
    loadAnnouncements();

    window.addEventListener('afnp-user-change', loadUser);
    window.addEventListener('afnp-announcement-change', loadAnnouncements);

    return () => {
      window.removeEventListener('afnp-user-change', loadUser);
      window.removeEventListener('afnp-announcement-change', loadAnnouncements);
    };
  }, []);

  const handleLogout = () => {
    DB.logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1d9bf0] shadow-md border-b border-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              {/* Removed outer styling wrapper to fix 'image in image' look */}
              <div className="w-14 h-14 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center">
                <Logo className="w-full h-full" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-xl lg:text-2xl tracking-tight text-white group-hover:opacity-90 transition-opacity leading-none">
                  AfricaNewsPay
                </span>
                {user && (
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                    {user.username}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {user ? (
                <>
                  <Link to="/dashboard" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                    <UserIcon size={18} /> Dashboard
                  </Link>
                  <Link to="/wallet" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                    <Wallet size={18} /> K{user.points.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </Link>
                  {user.isAdmin && (
                    <Link to="/admin" className="text-white hover:bg-white/10 px-3 py-2 rounded-lg font-bold flex items-center gap-2">
                      <ShieldCheck size={18} /> Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-1 text-white/90 hover:text-white font-medium ml-2">
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-white font-bold flex items-center gap-1 hover:gap-2 transition-all">
                    <LogIn size={18} /> Login
                  </Link>
                  <Link to="/signup" className="bg-slate-100 text-slate-900 px-5 py-2 rounded-lg font-bold hover:bg-white transition-all shadow-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
              {!user && (
                 <>
                  <Link to="/login" className="text-white font-bold text-sm flex items-center gap-1">
                     <LogIn size={16} /> Login
                  </Link>
                  <Link to="/signup" className="bg-slate-100 text-slate-900 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm">
                    Sign Up
                  </Link>
                 </>
              )}
              {user && (
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-white">
                   {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                 </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && user && (
          <div className="md:hidden bg-[#1d9bf0] border-t border-blue-400 py-2 px-4 space-y-2 animate-in slide-in-from-top-4 duration-300 shadow-xl">
             <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block text-white font-semibold py-3 border-b border-white/10">Dashboard</Link>
             <Link to="/wallet" onClick={() => setIsMenuOpen(false)} className="block text-white font-semibold py-3 border-b border-white/10">Wallet (K{user.points.toFixed(2)})</Link>
             {user.isAdmin && <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-white font-bold py-3 border-b border-white/10">Admin Panel</Link>}
             <button onClick={handleLogout} className="w-full text-left text-white/80 font-bold py-3 mt-2">Logout</button>
          </div>
        )}
      </header>
      
      {/* Announcement Ticker */}
      {announcements.length > 0 && (
        <div className="bg-slate-900 text-white overflow-hidden py-2 relative h-10 border-b border-slate-800">
          <div className="animate-marquee inline-flex whitespace-nowrap items-center h-full">
            {/* Map through announcements once to fix duplication issue */}
            {announcements.map((a) => (
              <span key={a.id} className="mx-8 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> {a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h2 className="font-sans text-2xl font-bold mb-4 flex items-center gap-3">
               {/* Removed outer styling wrapper to fix 'image in image' look */}
               <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <Logo className="w-full h-full" />
               </div>
               Africa News Pay
            </h2>
            <p className="text-slate-400 max-w-sm leading-relaxed mb-6 text-sm">
              Empowering African stories and rewarding our community for staying informed.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-slate-200">Links</h3>
            <ul className="space-y-2 text-slate-400 font-medium text-sm">
              <li><Link to="/" className="hover:text-[#1d9bf0]">Home</Link></li>
              <li><Link to="/login" className="hover:text-[#1d9bf0]">Login</Link></li>
              <li><Link to="/signup" className="hover:text-[#1d9bf0]">Register</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-slate-200">Legal</h3>
            <ul className="space-y-2 text-slate-400 font-medium text-sm">
              <li><a href="#" className="hover:text-[#1d9bf0]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#1d9bf0]">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs font-medium">
          &copy; {new Date().getFullYear()} Africa News Pay. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};