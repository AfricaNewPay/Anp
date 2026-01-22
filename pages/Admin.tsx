import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { User, Post, PostStatus, Withdrawal, Announcement, InviteCode, Transaction } from '../types';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Megaphone, 
  Key, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Users, 
  Lock, 
  BarChart3, 
  Search,
  Coins,
  RefreshCw,
  Copy,
  UserCheck,
  Edit,
  Check,
  X,
  History,
  CheckSquare,
  Square,
  Shuffle
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'moderation' | 'finance' | 'invites' | 'settings';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Moderation Selection State
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newInviteCode, setNewInviteCode] = useState('');

  // Editing state for announcements
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // User History Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [fundAmount, setFundAmount] = useState<string>('');
  const [fundReason, setFundReason] = useState<string>('');

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetTargetName, setResetTargetName] = useState<string>('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    const [u, p, w, a, i, t] = await Promise.all([
       DB.getUsers(),
       DB.getPosts(),
       DB.getWithdrawals(),
       DB.getAnnouncements(),
       DB.getInviteCodes(),
       DB.getTransactions()
    ]);
    setUsers(u);
    setPosts(p);
    setWithdrawals(w);
    setAnnouncements(a);
    setInviteCodes(i);
    setTransactions(t);
    // Clear selection on reload
    setSelectedPostIds([]);
    setLoading(false);
  };

  useEffect(() => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const handleApprovePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post && post.status !== PostStatus.APPROVED) {
       setProcessing(true);
       const updatedPost = { ...post, status: PostStatus.APPROVED };
       await DB.updatePost(updatedPost);
       await DB.addPoints(post.authorId, 10, 'POST_APPROVED', postId);
       await loadData();
       setProcessing(false);
    }
  };

  const handleRejectPost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setProcessing(true);
      const updatedPost = { ...post, status: PostStatus.REJECTED };
      await DB.updatePost(updatedPost);
      await loadData();
      setProcessing(false);
    }
  };

  // Bulk Moderation Actions
  const handleToggleSelectPost = (postId: string) => {
    setSelectedPostIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
  };

  const handleSelectAllPosts = () => {
    const pending = posts.filter(p => p.status === PostStatus.PENDING);
    if (selectedPostIds.length === pending.length && pending.length > 0) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(pending.map(p => p.id));
    }
  };

  const handleSelectRandomPosts = () => {
    const pending = posts.filter(p => p.status === PostStatus.PENDING);
    if (pending.length === 0) return;
    
    // Select 5 random or all if less than 5
    const count = Math.min(pending.length, 5);
    const shuffled = [...pending].sort(() => 0.5 - Math.random());
    setSelectedPostIds(shuffled.slice(0, count).map(p => p.id));
  };

  const handleBulkProcess = async (action: 'APPROVE' | 'REJECT') => {
    if (selectedPostIds.length === 0) return;
    
    if(!window.confirm(`Are you sure you want to ${action} ${selectedPostIds.length} articles?`)) return;

    setProcessing(true);
    let processedCount = 0;
    
    // Process sequentially to prevent DB race conditions on User point updates
    for (const id of selectedPostIds) {
        const post = posts.find(p => p.id === id);
        if(post && post.status === PostStatus.PENDING) {
             const updatedPost = { ...post };
             
             if(action === 'APPROVE') {
                 updatedPost.status = PostStatus.APPROVED;
                 const success = await DB.updatePost(updatedPost);
                 if (success) {
                     await DB.addPoints(updatedPost.authorId, 10, 'POST_APPROVED', updatedPost.id);
                     processedCount++;
                 }
             } else {
                 updatedPost.status = PostStatus.REJECTED;
                 const success = await DB.updatePost(updatedPost);
                 if (success) processedCount++;
             }
        }
    }

    if (processedCount > 0) {
      await loadData(); 
      setSelectedPostIds([]); // Clear selection
      alert(`Successfully ${action === 'APPROVE' ? 'approved' : 'rejected'} ${processedCount} articles.`);
    } else {
      alert("No pending articles processed. They may have already been updated.");
    }
    
    setProcessing(false);
  };

  const handleWithdrawalStatus = async (wId: string, status: 'Paid' | 'Rejected') => {
    const withdrawal = withdrawals.find(w => w.id === wId);
    
    if (withdrawal) {
      if (withdrawal.status !== 'Pending') {
        alert(`This request has already been processed as ${withdrawal.status}.`);
        return;
      }
      setProcessing(true);
      if (status === 'Rejected') {
        await DB.adjustUserFunds(withdrawal.userId, withdrawal.amount, `Refund for rejected withdrawal ${withdrawal.id}`);
        alert(`Withdrawal rejected. K${withdrawal.amount} has been refunded.`);
      }
      const updatedWithdrawal = { ...withdrawal, status };
      const timestamp = new Date().toLocaleString();
      updatedWithdrawal.details += ` [${status.toUpperCase()} @ ${timestamp}]`;
      await DB.updateWithdrawal(updatedWithdrawal);
      await loadData();
      setProcessing(false);
    }
  };

  const openResetPasswordModal = (user: User) => {
    setResetTargetId(user.id);
    setResetTargetName(user.username);
    setResetPasswordInput('');
    setResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetId) return;
    if (resetPasswordInput.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    if (await DB.resetUserPassword(resetTargetId, resetPasswordInput)) {
        alert(`Success: Password for ${resetTargetName} has been reset.`);
        setResetModalOpen(false);
        setResetTargetId(null);
        setResetPasswordInput('');
        loadData();
    } else {
        alert('Error: Could not reset password.');
    }
  };

  const handleManualFundAdjustment = async (isDeduction: boolean) => {
     if (!selectedUser) return;
     const val = parseFloat(fundAmount);
     if (isNaN(val) || val <= 0) {
        alert('Please enter a valid positive number.');
        return;
     }
     const finalAmount = isDeduction ? -val : val;
     const reason = fundReason.trim() || 'Manual Admin Adjustment';
     if (isDeduction && selectedUser.points < val) {
        alert('User has insufficient funds for this deduction.');
        return;
     }
     if (await DB.adjustUserFunds(selectedUser.id, finalAmount, reason)) {
        alert(`Successfully ${isDeduction ? 'deducted' : 'added'} K${val}.`);
        setFundAmount('');
        setFundReason('');
        loadData();
        const updatedUser = (await DB.getUsers()).find(u => u.id === selectedUser.id);
        if (updatedUser) setSelectedUser(updatedUser);
     } else {
        alert('Failed to update funds.');
     }
  };

  const handleDeleteUser = async (userId: string) => {
    const currentUser = DB.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      alert('You cannot delete your own active admin account.');
      return;
    }
    if (window.confirm('WARNING: Are you sure you want to permanently delete this user account? This action cannot be undone.')) {
      if (await DB.deleteUser(userId)) {
        alert('User account deleted successfully.');
        loadData();
        if (selectedUser?.id === userId) setSelectedUser(null);
      } else {
        alert('Failed to delete user.');
      }
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    const newAnn: Announcement = { id: crypto.randomUUID(), text: newAnnouncement, active: true };
    await DB.saveAnnouncements([newAnn]); // Upsert
    setAnnouncements([...announcements, newAnn]);
    setNewAnnouncement('');
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await DB.deleteAnnouncement(id);
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const handleStartEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setEditingText(ann.text);
  };

  const handleSaveEditAnnouncement = async () => {
    if (!editingText.trim() || !editingAnnouncementId) return;
    const ann = announcements.find(a => a.id === editingAnnouncementId);
    if(ann) {
        ann.text = editingText;
        await DB.saveAnnouncements([ann]);
        setAnnouncements(announcements.map(a => a.id === editingAnnouncementId ? ann : a));
    }
    setEditingAnnouncementId(null);
    setEditingText('');
  };

  const handleCancelEditAnnouncement = () => {
    setEditingAnnouncementId(null);
    setEditingText('');
  };

  const handleAddInviteCode = async () => {
    const code = newInviteCode.trim() || Math.random().toString(36).substr(2, 8).toUpperCase();
    const newCode: InviteCode = { id: crypto.randomUUID(), code: code.toUpperCase(), createdBy: 'admin', used: false };
    await DB.createInviteCode(newCode);
    setInviteCodes([...inviteCodes, newCode]);
    setNewInviteCode('');
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phoneNumber.includes(searchTerm)
  );

  const pendingPosts = posts.filter(p => p.status === PostStatus.PENDING);
  const totalPointsInSystem = users.reduce((sum, u) => sum + u.points, 0);

  const tabs: {id: AdminTab, label: string, icon: any}[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'moderation', label: 'Article Approval', icon: Megaphone },
    { id: 'finance', label: 'Withdrawals', icon: DollarSign },
    { id: 'invites', label: 'Invite Codes', icon: Key },
    { id: 'settings', label: 'Announcements', icon: Trash2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative">
      
      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Lock size={20} className="text-primary"/> Reset Password
                </h3>
                <button onClick={() => setResetModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleResetPasswordSubmit} className="p-8 space-y-6">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target User</p>
                    <p className="font-black text-slate-900 text-lg">{resetTargetName}</p>
                 </div>
                 <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">New Password</label>
                    <input 
                      type="text" 
                      value={resetPasswordInput} 
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                      required
                      minLength={6}
                    />
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                    <CheckCircle size={20}/> Update Password
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
               <div className="p-8 border-b flex justify-between items-start sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-inner">
                        {selectedUser.username[0]}
                     </div>
                     <div>
                        <h2 className="text-3xl font-black text-slate-900">{selectedUser.username}</h2>
                        <p className="text-slate-500 font-bold">{selectedUser.email}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                     <X size={24}/>
                  </button>
               </div>
               
               <div className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Current Balance</p>
                        <h3 className="text-4xl font-black text-primary">K{selectedUser.points.toLocaleString()}</h3>
                     </div>
                     <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Withdrawals</p>
                        <h3 className="text-4xl font-black text-slate-700">K{withdrawals.filter(w => w.userId === selectedUser.id && w.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</h3>
                     </div>
                     <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Referrals</p>
                        <div className="flex gap-4">
                           <span className="font-bold text-slate-600 text-sm">{selectedUser.referralCount || 0} Invited</span>
                           <span className="font-bold text-indigo-600 text-sm">K{(selectedUser.referralEarnings || 0).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                     <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2"><DollarSign size={20}/> Manual Funds Adjustment</h3>
                     <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-grow w-full md:w-auto">
                           <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Amount (ZMW)</label>
                           <input 
                              type="number" 
                              value={fundAmount}
                              onChange={(e) => setFundAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-primary"
                           />
                        </div>
                        <div className="flex-grow w-full md:w-[40%]">
                           <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reason</label>
                           <input 
                              type="text" 
                              value={fundReason}
                              onChange={(e) => setFundReason(e.target.value)}
                              placeholder="Bonus, Correction, Penalty..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-primary"
                           />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                           <button onClick={() => handleManualFundAdjustment(false)} className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-600 transition-colors shadow-lg shadow-green-100">Add</button>
                           <button onClick={() => handleManualFundAdjustment(true)} className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-100">Deduct</button>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><History size={20}/> Transaction History</h3>
                     {(() => {
                        const userTx = transactions.filter(t => t.userId === selectedUser.id);
                        const userWd = withdrawals.filter(w => w.userId === selectedUser.id);
                        if (userTx.length === 0 && userWd.length === 0) {
                           return <p className="text-slate-400 font-bold italic">No transaction history found.</p>;
                        }
                        return (
                           <div className="border rounded-2xl overflow-hidden">
                              <table className="w-full text-left">
                                 <thead className="bg-slate-50 border-b">
                                    <tr>
                                       <th className="py-3 px-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Date</th>
                                       <th className="py-3 px-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Type</th>
                                       <th className="py-3 px-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Description</th>
                                       <th className="py-3 px-4 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Amount</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y">
                                    {[
                                       ...userTx.map(t => ({...t, category: 'TX'})),
                                       ...userWd.map(w => ({
                                          id: w.id, 
                                          userId: w.userId, 
                                          amount: -w.amount, 
                                          type: w.status === 'Paid' ? 'WITHDRAWAL' : w.status === 'Rejected' ? 'FAILED_WITHDRAWAL' : 'PENDING_WITHDRAWAL', 
                                          description: w.details, 
                                          createdAt: w.createdAt, 
                                          category: 'WD'
                                       }))
                                    ]
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map((item: any) => (
                                       <tr key={`${item.category}-${item.id}`} className="hover:bg-slate-50">
                                          <td className="py-3 px-4 text-xs font-bold text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                                          <td className="py-3 px-4">
                                             <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                                                item.type === 'EARN' ? 'bg-green-100 text-green-700' :
                                                item.type === 'WITHDRAWAL' ? 'bg-blue-100 text-blue-700' :
                                                item.type === 'ADJUSTMENT' ? 'bg-purple-100 text-purple-700' :
                                                'bg-amber-100 text-amber-700'
                                             }`}>
                                                {item.type}
                                             </span>
                                          </td>
                                          <td className="py-3 px-4 text-sm font-medium text-slate-700">{item.description}</td>
                                          <td className={`py-3 px-4 text-right font-black text-sm ${item.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                             {item.amount > 0 ? '+' : ''}K{Math.abs(item.amount).toLocaleString()}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        );
                     })()}
                  </div>
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-4 border shadow-sm sticky top-24">
            <div className="flex items-center gap-3 px-4 py-6 border-b mb-4">
              <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-tight">Admin</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Control Center</p>
              </div>
            </div>
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    activeTab === tab.id 
                    ? 'bg-primary text-white shadow-xl shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {tab.id === 'moderation' && pendingPosts.length > 0 && (
                    <span className="ml-auto bg-white text-primary text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">{pendingPosts.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <button onClick={loadData} disabled={loading} className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 rounded-xl hover:text-primary transition-all font-bold text-xs uppercase tracking-widest">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Panel
            </button>
          </div>
        </div>

        <div className="flex-grow">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border shadow-sm min-h-[650px] relative">
            {processing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-[2.5rem]">
                 <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                    <RefreshCw className="animate-spin text-primary mb-3" size={32}/>
                    <p className="font-bold text-slate-700">Processing...</p>
                 </div>
              </div>
            )}
            
            {activeTab === 'overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-10">
                   <h2 className="text-3xl font-black text-slate-900">Platform Overview</h2>
                   <div className="bg-blue-50 px-4 py-2 rounded-xl text-primary font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14}/> Verified Admin Session
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', val: users.length, icon: Users, col: 'blue' },
                    { label: 'System Liquidity (ZMW)', val: `K${totalPointsInSystem.toLocaleString()}`, icon: Coins, col: 'blue' },
                    { label: 'Pending Articles', val: pendingPosts.length, icon: Megaphone, col: 'amber' },
                    { label: 'Unpaid Withdrawals', val: withdrawals.filter(w => w.status === 'Pending').length, icon: DollarSign, col: 'blue' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between hover:border-primary transition-colors">
                      <stat.icon className={`text-${stat.col === 'blue' ? 'primary' : 'amber-500'} mb-4`} size={24} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-slate-900">{stat.val}</h3>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                   <div className="relative z-10">
                      <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                        <UserCheck className="text-primary"/> Dashboard Guide
                      </h3>
                      <p className="text-slate-400 font-medium max-w-xl leading-relaxed mb-6">
                        From here you can manage all user accounts, approve news stories submitted by the community, and process payout requests.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-primary font-black text-[10px] uppercase tracking-widest mb-1">User Reset</p>
                            <p className="text-xs text-slate-300">Quickly reset forgotten passwords in User Mgmt.</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">Moderation</p>
                            <p className="text-xs text-slate-300">Keep the platform clean by approving only quality news.</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-1">Codes</p>
                            <p className="text-xs text-slate-300">Mandatory signup codes prevent bot spam.</p>
                         </div>
                      </div>
                   </div>
                   <ShieldCheck size={200} className="absolute -bottom-10 -right-10 text-white opacity-5" />
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b pb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">User Management</h2>
                    <p className="text-slate-500 font-bold text-sm">Help users reset passwords or adjust point balances</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search name, email, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">User Details</th>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">Balance (ZMW)</th>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">Ref</th>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4 text-right">Administrative Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-6 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black uppercase shadow-sm">
                                {u.username[0]}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 flex items-center gap-2">
                                  {u.username}
                                  {u.isAdmin && <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-tighter shadow-sm shadow-blue-200">System Admin</span>}
                                </p>
                                <p className="text-xs font-bold text-slate-500">{u.email}</p>
                                <p className="text-[10px] font-bold text-slate-400">{u.phoneNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-4">
                            <div className="flex items-center gap-2 font-black text-primary text-lg">
                               <Coins size={16} className="text-primary"/> K{u.points.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-6 px-4">
                            <div className="text-xs font-bold text-slate-600">
                               {u.referralCount || 0} Invites
                            </div>
                            <div className="text-[10px] font-black text-indigo-500">
                               K{(u.referralEarnings || 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-6 px-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                               <button onClick={() => setSelectedUser(u)} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-primary px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:text-primary transition-all shadow-sm"><History size={14}/> Manage</button>
                               <button onClick={() => openResetPasswordModal(u)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"><Lock size={14}/> Reset</button>
                               <button onClick={() => handleDeleteUser(u.id)} className="flex items-center gap-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="animate-in fade-in duration-300">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 mb-1">Content Moderation</h2>
                      <p className="text-slate-500 font-bold text-sm">Review & approve community news ({pendingPosts.length} pending)</p>
                    </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button onClick={handleSelectAllPosts} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:border-primary hover:text-primary transition-colors">
                       {selectedPostIds.length === pendingPosts.length && pendingPosts.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                       Select All
                    </button>
                    <button onClick={handleSelectRandomPosts} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:border-primary hover:text-primary transition-colors">
                       <Shuffle size={16}/> Select Random (5)
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                    <button disabled={selectedPostIds.length === 0} onClick={() => handleBulkProcess('APPROVE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedPostIds.length > 0 ? 'bg-primary text-white hover:bg-blue-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                       <CheckCircle size={16}/> Approve Selected ({selectedPostIds.length})
                    </button>
                    <button disabled={selectedPostIds.length === 0} onClick={() => handleBulkProcess('REJECT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedPostIds.length > 0 ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                       <XCircle size={16}/> Reject Selected ({selectedPostIds.length})
                    </button>
                 </div>
                 
                 {pendingPosts.length === 0 ? (
                   <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                      <Megaphone className="text-slate-200 mx-auto mb-6" size={64} />
                      <p className="text-slate-400 font-black text-xl">All clear!</p>
                      <p className="text-slate-300 font-bold">There are no pending articles for review.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-4">
                     {pendingPosts.map(p => (
                       <div key={p.id} className={`bg-white rounded-2xl p-4 border transition-all flex flex-col md:flex-row gap-4 items-start ${selectedPostIds.includes(p.id) ? 'border-primary shadow-md bg-blue-50/10' : 'border-slate-100 shadow-sm'}`}>
                          <div className="flex items-start gap-4 flex-grow w-full">
                             <div className="pt-2">
                                <button onClick={() => handleToggleSelectPost(p.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedPostIds.includes(p.id) ? 'bg-primary border-primary text-white' : 'border-slate-300 text-transparent hover:border-slate-400'}`}>
                                  <Check size={14} strokeWidth={4} />
                                </button>
                             </div>
                             <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover"/>
                             </div>
                             <div className="flex-grow min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">{p.category}</span>
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">BY {p.authorName}</span>
                                  <span className="text-[9px] text-slate-300 font-bold ml-auto hidden md:inline">{new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 leading-tight mb-2 line-clamp-1">{p.title}</h3>
                                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">{p.content}</p>
                             </div>
                          </div>
                          <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 md:border-l md:pl-4 md:border-slate-100">
                              <button onClick={() => handleApprovePost(p.id)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><CheckCircle size={14}/> Approve</button>
                              <button onClick={() => handleRejectPost(p.id)} className="flex-1 bg-red-50 text-red-500 hover:bg-red-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><XCircle size={14}/> Reject</button>
                              <a href={`#/article/${p.id}`} target="_blank" className="bg-white border border-slate-200 text-slate-400 p-2 rounded-xl hover:text-primary hover:border-primary transition-all flex items-center justify-center"><ExternalLink size={16}/></a>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="animate-in fade-in duration-300">
                 <h2 className="text-3xl font-black mb-2 text-slate-900">Payout Requests</h2>
                 <p className="text-slate-500 font-bold mb-10">Manage community point-to-cash conversions</p>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">User Details</th>
                          <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">Amount</th>
                          <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4">Payment Method</th>
                          <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {withdrawals.length === 0 ? (
                          <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-black text-lg">No withdrawals found.</td></tr>
                        ) : (
                          withdrawals.map(w => (
                            <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-6 px-4">
                                 <p className="font-black text-slate-900">{w.username}</p>
                                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{new Date(w.createdAt).toLocaleString()}</p>
                              </td>
                              <td className="py-6 px-4">
                                 <div className="font-black text-primary text-xl flex items-center gap-2"><Coins size={16}/> K{w.amount}</div>
                                 <div className="mt-1">
                                    {w.source === 'REFERRAL' 
                                        ? <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Referral</span>
                                        : <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Activity</span>
                                    }
                                 </div>
                              </td>
                              <td className="py-6 px-4">
                                 <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl inline-block"><p className="text-[11px] font-black text-primary uppercase tracking-tight">{w.details}</p></div>
                              </td>
                              <td className="py-6 px-4 text-right">
                                 <div className="flex items-center justify-end gap-3">
                                    {w.status === 'Pending' ? (
                                      <>
                                        <button onClick={() => handleWithdrawalStatus(w.id, 'Paid')} className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"><CheckCircle size={18}/></button>
                                        <button onClick={() => handleWithdrawalStatus(w.id, 'Rejected')} className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all"><XCircle size={18}/></button>
                                      </>
                                    ) : (
                                      <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${w.status === 'Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' : w.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600'}`}>{w.status}</span>
                                    )}
                                 </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                   </table>
                 </div>
              </div>
            )}

            {activeTab === 'invites' && (
              <div className="animate-in fade-in duration-300">
                 <h2 className="text-3xl font-black mb-2 text-slate-900">Signup Verification Codes</h2>
                 <p className="text-slate-500 font-bold mb-10">Users cannot sign up without a valid code from this list</p>
                 <div className="bg-primary rounded-[2.5rem] p-8 text-white mb-12 shadow-2xl shadow-blue-200">
                   <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-grow w-full">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2 ml-1">Custom Code Name</label>
                        <input type="text" value={newInviteCode} onChange={(e) => setNewInviteCode(e.target.value)} placeholder="E.G. 'VIP-ACCESS'" className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-white text-white transition-all placeholder:text-white/30" />
                      </div>
                      <button onClick={handleAddInviteCode} className="w-full md:w-auto bg-white text-primary px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-100 flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"><Plus size={22}/> Generate Code</button>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inviteCodes.slice().reverse().map(c => (
                      <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary transition-all">
                         <div className="flex-grow">
                            <div className="flex items-center gap-2">
                               <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-primary transition-colors">{c.code}</p>
                               <button onClick={() => { navigator.clipboard.writeText(c.code); alert('Code copied to clipboard!'); }} className="text-slate-300 hover:text-primary transition-colors"><Copy size={14}/></button>
                            </div>
                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mt-3 border ${c.used ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-primary border-blue-100'}`}>{c.used ? 'Redeemed' : 'Ready For Signup'}</span>
                         </div>
                         <div className={`p-4 rounded-2xl shrink-0 ${c.used ? 'text-slate-300 bg-slate-50' : 'text-primary bg-blue-50'}`}><Key size={28}/></div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'settings' && (
               <div className="animate-in fade-in duration-300">
                  <h2 className="text-3xl font-black mb-2 text-slate-900">Broadcast Settings</h2>
                  <p className="text-slate-500 font-bold mb-10">Control the scrolling news ticker on the homepage</p>
                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-12 shadow-inner">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">New Ticker Message</label>
                    <div className="flex gap-4">
                      <input type="text" value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} placeholder="Welcome to the team!" className="flex-grow bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                      <button onClick={handleAddAnnouncement} className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all hover:-translate-y-0.5"><Plus size={24}/> Publish</button>
                    </div>
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><RefreshCw size={12} className="text-primary"/> Active Announcements</h4>
                  <div className="space-y-4">
                    {announcements.length === 0 ? (<p className="text-center py-10 text-slate-400 font-bold italic">No active announcements.</p>) : (
                      announcements.map(a => (
                        <div key={a.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                           {editingAnnouncementId === a.id ? (
                             <div className="flex items-center gap-3 w-full">
                               <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-grow bg-slate-50 border border-blue-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary transition-all" autoFocus />
                               <button onClick={handleSaveEditAnnouncement} className="bg-green-50 text-green-600 p-3 rounded-xl hover:bg-green-100 transition-colors"><Check size={20}/></button>
                               <button onClick={handleCancelEditAnnouncement} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-100 transition-colors"><X size={20}/></button>
                             </div>
                           ) : (
                             <div className="flex items-center justify-between w-full">
                               <p className="font-bold text-slate-700 flex items-center gap-4"><span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shrink-0"></span>{a.text}</p>
                               <div className="flex items-center gap-2">
                                  <button onClick={() => handleStartEditAnnouncement(a)} className="text-slate-300 hover:text-blue-500 transition-colors p-2.5 rounded-xl hover:bg-blue-50"><Edit size={20}/></button>
                                  <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2.5 rounded-xl hover:bg-red-50"><Trash2 size={20}/></button>
                               </div>
                             </div>
                           )}
                        </div>
                      ))
                    )}
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};