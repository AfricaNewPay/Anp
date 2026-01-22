import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DB, generateUUID } from '../services/db';
import { User } from '../types';
import { UserPlus, ArrowRight, Smartphone, Key, MessageCircle, Mail, Lock, User as UserIcon, X, Users, CheckCircle } from 'lucide-react';

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ePin, setEPin] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for referral code in URL
  useEffect(() => {
    const refParam = searchParams.get('ref') || searchParams.get('referral');
    if (refParam) {
        setReferralCodeInput(refParam);
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const exists = await DB.checkUserExists(fullName, email, phone);
      if (exists) {
        setError('An account with these details (Email, Phone, or Username) already exists.');
        setLoading(false);
        return;
      }

      const codes = await DB.getInviteCodes();
      // Validate E-Pin (verification code)
      const codeIdx = codes.findIndex(c => c.code === ePin.toUpperCase() && !c.used);
      if (codeIdx === -1) {
        setError('Invalid or already used E-Pin. Please purchase a valid PIN.');
        setLoading(false);
        return;
      }

      // Generate unique random 8-char alphanumeric referral code for new user
      const generatedRefCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Handle Referral Logic
      if (referralCodeInput.trim()) {
        const users = await DB.getUsers(); // We need all users here to find referrer by code, assume optimized later
        // Ideally we would have getReferrerByCode query
        const referrer = users.find(u => u.referralCode === referralCodeInput.trim().toUpperCase());
        if (referrer) {
          // Award K50 to referrer
          referrer.referralEarnings = (referrer.referralEarnings || 0) + 50;
          referrer.referralCount = (referrer.referralCount || 0) + 1;
          
          await DB.updateUser(referrer);
          
          // Log transaction for referrer
          await DB.logTransaction({
            id: generateUUID(),
            userId: referrer.id,
            amount: 50,
            type: 'REFERRAL_BONUS',
            description: `Referral Bonus for inviting ${fullName}`,
            createdAt: new Date().toISOString()
          });
        }
      }

      const newUser: User = {
        id: generateUUID(),
        username: fullName,
        email,
        phoneNumber: phone,
        password,
        points: 0,
        referralEarnings: 0,
        referralCode: generatedRefCode,
        referralCount: 0,
        inviteCodeUsed: ePin.toUpperCase(),
        isAdmin: email.toLowerCase() === 'admin@anp.com',
        readPosts: [],
        commentedPosts: [],
        savedBeneficiaries: []
      };

      // Mark E-Pin as used
      codes[codeIdx].used = true;
      await DB.updateInviteCode(codes[codeIdx]);

      const result = await DB.createUser(newUser);
      if (result.success) {
         DB.setCurrentUser(newUser);
         navigate('/dashboard');
      } else {
         setError(result.message || "Failed to create account. Database error.");
      }
    } catch (e) {
      console.error(e);
      setError("An unexpected error occurred.");
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
          <div className="flex flex-col items-center mb-8">
             <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200 rotate-3 transform hover:rotate-6 transition-transform">
                <UserPlus size={40}/>
             </div>
             <h1 className="font-sans text-3xl font-black text-slate-900 text-center">Join Community</h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Create your news account</p>
          </div>

          {error && <p className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 text-center animate-in shake">{error}</p>}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Names</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="email" 
                  required
                  placeholder="name@anp.com"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
              <div className="relative group">
                <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="tel" 
                  required
                  placeholder="0970000000"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${confirmPassword && confirmPassword === password ? 'text-green-500' : 'text-slate-300 group-focus-within:text-primary'}`} size={18}/>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 font-bold text-slate-800 transition-all focus:bg-white ${confirmPassword && password !== confirmPassword ? 'border-red-200 focus:ring-red-500' : 'border-slate-100 focus:ring-primary'}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && confirmPassword === password && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in">
                            <CheckCircle size={18} />
                        </div>
                    )}
                  </div>
                </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Referral Code (Optional)</label>
              <div className="relative group">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>
                <input 
                  type="text" 
                  placeholder="Enter Referral Code"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 transition-all focus:bg-white uppercase"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  disabled={searchParams.get('ref') ? true : false} // Disable if autofilled
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 ml-1">E-Pin (Verification Code)</label>
              <div className="relative group">
                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={18}/>
                <input 
                  type="text" 
                  required
                  placeholder="ENTER E-PIN"
                  className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-primary font-black text-primary transition-all uppercase placeholder:text-blue-200 focus:bg-white"
                  value={ePin}
                  onChange={(e) => setEPin(e.target.value)}
                />
              </div>
              <a href="https://wa.me/260970000000?text=I%20want%20to%20purchase%20an%20E-Pin%20for%20Africa%20News%20Pay" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-green-700 font-black text-[10px] uppercase tracking-widest hover:underline justify-center bg-green-100 py-3.5 rounded-2xl border border-green-200 hover:bg-green-200 transition-all shadow-sm">
                 <MessageCircle size={16}/> Purchase E-Pin on WhatsApp (K100)
              </a>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70">
              {loading ? 'Creating Account...' : <><span className="mr-1">Join Now</span> <ArrowRight size={24}/></>}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-bold text-sm">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};