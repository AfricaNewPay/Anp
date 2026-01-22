import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { User, Withdrawal, Beneficiary } from '../types';
import { Wallet as WalletIcon, ArrowDownCircle, History, Landmark, Smartphone, AlertCircle, CheckCircle, ChevronDown, User as UserIcon, Save, Users, Layers } from 'lucide-react';

export const Wallet: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState(1000);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Withdrawal Source State (Activity vs Referral)
  const [withdrawSource, setWithdrawSource] = useState<'ACTIVITY' | 'REFERRAL'>('ACTIVITY');

  // Withdrawal Form State
  const [paymentMethod, setPaymentMethod] = useState<'Mobile' | 'Bank'>('Mobile');
  
  // Mobile Money Strategy
  const [mobileStrategy, setMobileStrategy] = useState<'Registered' | 'Saved' | 'New'>('Registered');
  
  // Registered
  const [regProvider, setRegProvider] = useState('MTN');
  
  // Saved
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  
  // New
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newProvider, setNewProvider] = useState('MTN');
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);

  // Bank
  const [bankDetails, setBankDetails] = useState('');

  const navigate = useNavigate();

  const loadUserData = async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const freshUser = await DB.refreshSession() || currentUser;
    setUser(freshUser);

    const allWithdrawals = await DB.getWithdrawals();
    setWithdrawals(allWithdrawals.filter(w => w.userId === freshUser.id));
    
    // Set default saved beneficiary if exists
    if (freshUser.savedBeneficiaries && freshUser.savedBeneficiaries.length > 0) {
        setSelectedBeneficiaryId(freshUser.savedBeneficiaries[0].id);
    }
  };

  useEffect(() => {
    loadUserData();
    window.addEventListener('afnp-user-change', loadUserData);
    return () => window.removeEventListener('afnp-user-change', loadUserData);
  }, [navigate]);

  // Adjust min/max based on source
  const getMinAmount = () => withdrawSource === 'ACTIVITY' ? 1000 : 300;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const freshUser = await DB.refreshSession(); // Ensure balance is current
    if (!freshUser) return;

    const minAmt = getMinAmount();
    
    if (amount < minAmt || amount > 10000) {
      setMessage({ type: 'error', text: `Withdrawal must be between K${minAmt} and K10,000 for ${withdrawSource === 'ACTIVITY' ? 'Activity' : 'Referral'} balance.` });
      return;
    }

    const availableBalance = withdrawSource === 'ACTIVITY' ? freshUser.points : (freshUser.referralEarnings || 0);

    if (availableBalance < amount) {
      setMessage({ type: 'error', text: `Insufficient funds in ${withdrawSource === 'ACTIVITY' ? 'Activity' : 'Referral'} wallet.` });
      return;
    }

    let finalDetails = '';
    
    if (paymentMethod === 'Mobile') {
        let finalName = '';
        let finalNumber = '';
        let finalProvider = '';

        if (mobileStrategy === 'Registered') {
            finalName = freshUser.username;
            finalNumber = freshUser.phoneNumber;
            finalProvider = regProvider;
        } else if (mobileStrategy === 'Saved') {
            const beneficiary = freshUser.savedBeneficiaries?.find(b => b.id === selectedBeneficiaryId);
            if (!beneficiary) {
                setMessage({ type: 'error', text: 'Please select a valid saved beneficiary.' });
                return;
            }
            finalName = beneficiary.name;
            finalNumber = beneficiary.number;
            finalProvider = beneficiary.provider;
        } else if (mobileStrategy === 'New') {
            if (!newName.trim() || !newNumber.trim()) {
                setMessage({ type: 'error', text: 'Please enter account name and number.' });
                return;
            }
            finalName = newName;
            finalNumber = newNumber;
            finalProvider = newProvider;

            // Save Beneficiary Logic
            if (saveBeneficiary) {
                const newBen: Beneficiary = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: newName,
                    number: newNumber,
                    provider: newProvider
                };
                const currentSaved = freshUser.savedBeneficiaries || [];
                freshUser.savedBeneficiaries = [...currentSaved, newBen];
                // Note: User update happens below
            }
        }
        
        finalDetails = `${finalProvider} Mobile Money - ${finalName} (${finalNumber})`;
    } else {
        if (!bankDetails.trim()) {
            setMessage({ type: 'error', text: 'Please provide bank details.' });
            return;
        }
        finalDetails = `Bank Transfer: ${bankDetails}`;
    }

    // Deduct points from updated user object
    const updatedUser = { ...freshUser };
    if (withdrawSource === 'ACTIVITY') {
        updatedUser.points -= amount;
    } else {
        updatedUser.referralEarnings = (updatedUser.referralEarnings || 0) - amount;
    }
    
    // Save updated user data instantly
    await DB.updateUser(updatedUser);

    // Create withdrawal record
    const withdrawal: Withdrawal = {
      id: crypto.randomUUID(),
      userId: freshUser.id,
      username: freshUser.username,
      amount,
      source: withdrawSource,
      details: finalDetails,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    await DB.createWithdrawal(withdrawal);
    
    // Log Transaction for History
    await DB.logTransaction({
      id: Math.random().toString(36).substr(2, 9),
      userId: freshUser.id,
      amount: -amount,
      type: 'WITHDRAWAL',
      description: `Withdrawal (${withdrawSource}): ${finalDetails}`,
      createdAt: new Date().toISOString()
    });

    // Update local state
    setWithdrawals([withdrawal, ...withdrawals]);
    setUser(updatedUser); // Update UI immediately
    setAmount(1000);
    setNewName('');
    setNewNumber('');
    setBankDetails('');
    setMessage({ type: 'success', text: 'Withdrawal request submitted successfully.' });
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Withdrawal Form */}
        <div className="lg:col-span-5">
           <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border shadow-sm sticky top-24">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-primary">
                 <WalletIcon size={32} />
               </div>
               <div>
                 <h2 className="font-sans text-3xl font-black">Your Wallet</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Withdraw your earnings</p>
               </div>
             </div>

             {/* Dual Balance Cards */}
             <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${withdrawSource === 'ACTIVITY' ? 'bg-blue-50 border-primary ring-2 ring-blue-100' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100'}`} onClick={() => setWithdrawSource('ACTIVITY')}>
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <Layers size={18}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Activity</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">K{user.points.toLocaleString()}</div>
                 </div>
                 <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${withdrawSource === 'REFERRAL' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100'}`} onClick={() => setWithdrawSource('REFERRAL')}>
                    <div className="flex items-center gap-2 mb-2 text-indigo-600">
                        <Users size={18}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Referral</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">K{(user.referralEarnings || 0).toLocaleString()}</div>
                 </div>
             </div>

             <div className="bg-secondary text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Landmark size={80}/>
                </div>
                <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mb-2">
                    {withdrawSource === 'ACTIVITY' ? 'Activity Balance' : 'Referral Balance'}
                </p>
                <h3 className="text-5xl font-black">
                    K{withdrawSource === 'ACTIVITY' ? user.points.toLocaleString() : (user.referralEarnings || 0).toLocaleString()}
                </h3>
                <p className="mt-4 text-slate-400 text-sm font-medium">Min withdrawal: <span className="text-white font-bold">K{getMinAmount()}</span></p>
             </div>

             {message && (
               <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                 {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                 <span className="font-bold">{message.text}</span>
               </div>
             )}

             <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Withdrawal Amount (Min K{getMinAmount()})</label>
                   <input 
                    type="number"
                    min={getMinAmount()}
                    max="10000"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-black text-2xl"
                   />
                </div>
                
                {/* Payment Method Selector */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">Payment Method</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button" 
                        onClick={() => setPaymentMethod('Mobile')}
                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold ${paymentMethod === 'Mobile' ? 'border-primary bg-blue-50 text-primary shadow-inner' : 'border-slate-100 text-slate-400'}`}
                      >
                         <Smartphone size={20}/> Mobile Money
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('Bank')}
                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold ${paymentMethod === 'Bank' ? 'border-primary bg-blue-50 text-primary shadow-inner' : 'border-slate-100 text-slate-400'}`}
                      >
                         <Landmark size={20}/> Bank Transfer
                      </button>
                   </div>
                </div>

                {/* Mobile Money Options */}
                {paymentMethod === 'Mobile' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2">
                     
                     {/* Strategy Selection */}
                     <div className="flex flex-col gap-3">
                        <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${mobileStrategy === 'Registered' ? 'border-primary bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                            <input 
                                type="radio" 
                                name="mobStrategy" 
                                checked={mobileStrategy === 'Registered'}
                                onChange={() => setMobileStrategy('Registered')}
                                className="w-5 h-5 text-primary"
                            />
                            <div>
                                <span className="block font-bold text-slate-700">My Registered Number</span>
                                <span className="text-xs font-bold text-slate-400">{user.phoneNumber} ({user.username})</span>
                            </div>
                        </label>

                        {user.savedBeneficiaries && user.savedBeneficiaries.length > 0 && (
                            <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${mobileStrategy === 'Saved' ? 'border-primary bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                                <input 
                                    type="radio" 
                                    name="mobStrategy" 
                                    checked={mobileStrategy === 'Saved'}
                                    onChange={() => setMobileStrategy('Saved')}
                                    className="w-5 h-5 text-primary"
                                />
                                <span className="block font-bold text-slate-700">Saved Contact</span>
                            </label>
                        )}

                        <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${mobileStrategy === 'New' ? 'border-primary bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                            <input 
                                type="radio" 
                                name="mobStrategy" 
                                checked={mobileStrategy === 'New'}
                                onChange={() => setMobileStrategy('New')}
                                className="w-5 h-5 text-primary"
                            />
                            <span className="block font-bold text-slate-700">Use New Number</span>
                        </label>
                     </div>

                     {/* Details for Registered */}
                     {mobileStrategy === 'Registered' && (
                         <div className="animate-in fade-in">
                            <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Provider</label>
                            <div className="relative">
                                <select 
                                    value={regProvider}
                                    onChange={(e) => setRegProvider(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-slate-700 appearance-none"
                                >
                                    <option value="MTN">MTN Mobile Money</option>
                                    <option value="Airtel">Airtel Money</option>
                                    <option value="Zamtel">Zamtel Kwacha</option>
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                            </div>
                         </div>
                     )}

                     {/* Details for Saved */}
                     {mobileStrategy === 'Saved' && (
                         <div className="animate-in fade-in">
                             <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Select Beneficiary</label>
                             <div className="relative">
                                <select 
                                    value={selectedBeneficiaryId}
                                    onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-slate-700 appearance-none"
                                >
                                    {user.savedBeneficiaries?.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} - {b.provider} ({b.number})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                             </div>
                         </div>
                     )}

                     {/* Details for New */}
                     {mobileStrategy === 'New' && (
                         <div className="space-y-4 animate-in fade-in bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                    <input 
                                        type="text"
                                        placeholder="Enter Account Name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                    />
                                </div>
                             </div>
                             <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Provider</label>
                                <div className="relative">
                                    <select 
                                        value={newProvider}
                                        onChange={(e) => setNewProvider(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-slate-700 appearance-none"
                                    >
                                        <option value="MTN">MTN Mobile Money</option>
                                        <option value="Airtel">Airtel Money</option>
                                        <option value="Zamtel">Zamtel Kwacha</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18}/>
                                </div>
                             </div>
                             <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                    <input 
                                        type="tel"
                                        placeholder="Enter mobile number"
                                        value={newNumber}
                                        onChange={(e) => setNewNumber(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                    />
                                </div>
                             </div>
                             
                             <label className="flex items-center gap-3 pt-2 cursor-pointer">
                                 <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${saveBeneficiary ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}>
                                     {saveBeneficiary && <CheckCircle size={14} className="text-white"/>}
                                 </div>
                                 <input type="checkbox" checked={saveBeneficiary} onChange={(e) => setSaveBeneficiary(e.target.checked)} className="hidden"/>
                                 <span className="font-bold text-sm text-slate-600">Save this contact for future withdrawals</span>
                             </label>
                         </div>
                     )}

                  </div>
                )}

                {/* Bank Details Input */}
                {paymentMethod === 'Bank' && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Bank Details</label>
                        <textarea 
                            required
                            rows={3}
                            value={bankDetails}
                            onChange={(e) => setBankDetails(e.target.value)}
                            placeholder="Bank Name, Account Number, SWIFT Code"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                        />
                    </div>
                )}

                <button type="submit" className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                   Request Withdrawal <ArrowDownCircle size={24}/>
                </button>
             </form>
           </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-7">
           <div className="flex items-center justify-between mb-8">
              <h2 className="font-sans text-3xl font-black flex items-center gap-3">
                 <History className="text-primary" /> Withdrawal History
              </h2>
           </div>

           <div className="space-y-6">
              {withdrawals.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center border shadow-sm">
                   <p className="text-slate-400 font-bold">No withdrawal requests yet.</p>
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="bg-white rounded-3xl p-6 md:p-8 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-hover hover:shadow-md">
                     <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${w.status === 'Paid' ? 'bg-blue-50 text-blue-600' : w.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                           K{w.amount}
                        </div>
                        <div>
                           <p className="font-black text-slate-900 leading-tight flex items-center gap-2">
                               Withdrawal Request
                               {w.source === 'REFERRAL' && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase font-black tracking-wider">Ref</span>}
                           </p>
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{w.details}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(w.createdAt).toLocaleDateString()} @ {new Date(w.createdAt).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <div className="flex items-center">
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                          w.status === 'Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          w.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                           {w.status}
                        </span>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};