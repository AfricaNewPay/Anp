import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DB, generateUUID } from '../services/db';
import { User } from '../types';
import { LogIn, ArrowRight, Lock, X, User as UserIcon } from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedIdentifier = identifier.trim();
      
      // --- EMBEDDED ADMIN SEEDING LOGIC ---
      // If authenticating with specific admin credentials and account doesn't exist, create it on the fly.
      if (normalizedIdentifier.toLowerCase() === 'admin@anp.app' && password === 'admin1234') {
         const existingAdmin = await DB.getUserByIdentifier(normalizedIdentifier);
         if (!existingAdmin) {
            console.log("Admin account not found. Attempting to seed...");
            
            // 1. Ensure the system invite code exists to prevent Foreign Key errors
            await DB.ensureSystemCode();

            // 2. Create the admin user
            const newAdmin: User = {
               id: generateUUID(),
               username: 'Super Admin',
               email: 'admin@anp.app',
               phoneNumber: '0970000000',
               password: 'admin1234',
               points: 5000, // Starting balance for testing
               referralEarnings: 0,
               referralCode: 'ADMINKEY',
               referralCount: 0,
               isAdmin: true, // Key flag
               inviteCodeUsed: 'SYSTEM_ROOT',
               readPosts: [],
               commentedPosts: [],
               savedBeneficiaries: []
            };
            
            const result = await DB.createUser(newAdmin);
            if (result.success) {
                console.log("Admin seeded successfully.");
                DB.setCurrentUser(newAdmin);
                navigate('/dashboard');
                return;
            } else {
                setError(`System auto-configuration failed: ${result.message}`);
                setLoading(false);
                return;
            }
         }
      }
      // ------------------------------------

      // Efficiently fetch only the user trying to login (Email OR Phone)
      const user = await DB.getUserByIdentifier(normalizedIdentifier);
      
      if (user && user.password === password) {
        DB.setCurrentUser(user);
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please check your inputs and password.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors z-10"
        >
          <X size={24}/>
        </button>

        <div className="p-10 md:p-12">
          <div className="flex flex-col items-center mb-10">
             <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 rotate-3 transform hover:rotate-6 transition-transform">
                <LogIn size={40}/>
             </div>
             <h1 className="font-sans text-3xl font-black text-slate-900">Welcome Back</h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Log in to your account</p>
          </div>

          {error && <p className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 text-center animate-in shake">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email or Phone Number</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="text" 
                  required
                  placeholder="name@anp.com or 0970000000"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'Logging In...' : <><span className="mr-1">Log In</span> <ArrowRight size={24}/></>}
            </button>
          </form>

          <p className="mt-10 text-center text-slate-500 font-bold text-sm">
            New here? <Link to="/signup" className="text-primary hover:underline">Create an Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};