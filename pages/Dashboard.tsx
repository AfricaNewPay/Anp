import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB, generateUUID } from '../services/db';
import { User, Category, Post, PostStatus } from '../types';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, Gift, Edit, Save, X, User as UserIcon, Mail, Smartphone, Image as ImageIcon, Upload, Users, Copy, Link as LinkIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Post Submission State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(Category.POLITICS);
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phoneNumber: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadUserData = async () => {
    const currentUser = DB.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Fetch latest user data
    const freshUser = await DB.refreshSession() || currentUser;
    setUser(freshUser);
    setEditForm({
      username: freshUser.username,
      email: freshUser.email,
      phoneNumber: freshUser.phoneNumber
    });

    const allPosts = await DB.getPosts();
    setPosts(allPosts.filter(p => p.authorId === freshUser.id));

    const today = new Date().toISOString().split('T')[0];
    setDailyClaimed(freshUser.lastLoginDate === today);
  };

  useEffect(() => {
    loadUserData();
    
    // Listen for updates (in case points change elsewhere)
    window.addEventListener('afnp-user-change', loadUserData);
    return () => window.removeEventListener('afnp-user-change', loadUserData);
  }, [navigate]);

  const handleDailyLogin = async () => {
    if (!user) return;
    
    const result = await DB.addPoints(user.id, 5, 'DAILY');
    
    if (result.success) {
      setDailyClaimed(true);
      alert('Congratulations! +K5.00 Daily Login funds added and saved.');
    } else {
      if (result.message === 'Already claimed today') {
        setDailyClaimed(true);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Basic validation
    if (!editForm.username.trim() || !editForm.email.trim() || !editForm.phoneNumber.trim()) {
      alert('All fields are required.');
      return;
    }

    const updatedUser: User = {
      ...user,
      username: editForm.username,
      email: editForm.email,
      phoneNumber: editForm.phoneNumber
    };

    if (await DB.updateUser(updatedUser)) {
      setUser(updatedUser);
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } else {
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check (e.g. 2MB limit for local storage sanity)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please choose an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = DB.getCurrentUser();
    if (!currentUser) return;

    // Daily Limit Check: 5 Posts
    const today = new Date().toISOString().split('T')[0];
    const todaysPosts = posts.filter(p => p.createdAt.startsWith(today));
    
    if (todaysPosts.length >= 5) {
      alert("Daily post limit reached. You can only submit 5 articles per day.");
      return;
    }

    const newPost: Post = {
      id: generateUUID(),
      title,
      category,
      content,
      authorId: currentUser.id,
      authorName: currentUser.username,
      createdAt: new Date().toISOString(),
      status: PostStatus.PENDING,
      imageUrl: selectedImage || `https://picsum.photos/800/400?random=${Math.random()}`
    };

    const success = await DB.createPost(newPost);
    if (success) {
       setPosts([newPost, ...posts]);
       setTitle('');
       setContent('');
       setSelectedImage(null);
       setShowSubmit(false);
       alert('Article submitted! It will appear on the feed once approved by an admin. You earn K10.00 upon approval.');
    } else {
       alert('Failed to submit post.');
    }
  };

  const handleCopyLink = (text: string) => {
    // Try modern Clipboard API first (requires secure context)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Referral Link Copied!'))
        .catch((err) => {
            console.error('Clipboard write failed', err);
            fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure it's not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('Referral Link Copied!');
      } else {
        alert('Could not copy link automatically. Please select the text and copy it manually.');
      }
    } catch (err) {
      alert('Could not copy link automatically. Please select the text and copy it manually.');
    }
    
    document.body.removeChild(textArea);
  };

  if (!user) return null;

  // Generate the full referral link using the specific domain
  const referralLink = `https://www.africanewspay.com/#/signup?ref=${user.referralCode}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative">
      
      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                 <Edit size={20} className="text-primary"/> Edit Profile
               </h3>
               <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                   <div className="relative group">
                     <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                     <input 
                       type="text" 
                       value={editForm.username} 
                       onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                       required
                     />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                   <div className="relative group">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                     <input 
                       type="email" 
                       value={editForm.email} 
                       onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                       required
                     />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                   <div className="relative group">
                     <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                     <input 
                       type="tel" 
                       value={editForm.phoneNumber} 
                       onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                       required
                     />
                   </div>
                </div>
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                   <Save size={20}/> Save Changes
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-primary to-blue-900 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mb-2">Welcome Back,</p>
                   <h2 className="text-3xl font-black flex items-center gap-2">
                     {user.username}
                     <button onClick={() => setIsEditingProfile(true)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white" title="Edit Profile">
                        <Edit size={16}/>
                     </button>
                   </h2>
                   <p className="text-blue-200/60 font-bold text-xs mt-1">{user.email}</p>
                   <p className="text-blue-200/60 font-bold text-xs">{user.phoneNumber}</p>
                </div>
                <Gift className="text-blue-300 opacity-60" size={48} />
             </div>
             
             <div className="bg-white/10 rounded-2xl p-4 mb-6 backdrop-blur-sm border border-white/10">
               <p className="text-blue-200 font-bold uppercase tracking-widest text-[10px] mb-1">Activity Balance</p>
               <div className="text-4xl font-black">K{user.points.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
             </div>

             <button 
                disabled={dailyClaimed}
                onClick={handleDailyLogin}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${dailyClaimed ? 'bg-blue-950/50 text-blue-400 cursor-not-allowed' : 'bg-white text-primary hover:bg-slate-100 shadow-lg active:scale-95'}`}
             >
                {dailyClaimed ? 'Daily Funds Claimed' : 'Claim Daily K5.00'}
             </button>
          </div>
        </div>

        {/* Referral Dashboard Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-1">Referral Program</p>
                   <h2 className="text-2xl font-black flex items-center gap-2">Earn K50/Invite</h2>
                </div>
                <Users className="text-indigo-300 opacity-60" size={36} />
             </div>

             <div className="bg-white/10 rounded-2xl p-4 mb-4 backdrop-blur-sm border border-white/10">
               <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px] mb-1">Referral Earnings</p>
               <div className="text-3xl font-black">K{(user.referralEarnings || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
             </div>

             <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mt-auto">
               <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px] mb-2">Your Referral Link</p>
               <div className="flex items-center gap-2">
                 <div className="bg-white/10 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-tight flex-grow border border-white/10 truncate select-all">
                    {referralLink}
                 </div>
                 <button 
                    onClick={() => handleCopyLink(referralLink)}
                    className="p-2 bg-white text-indigo-900 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
                    title="Copy Link"
                 >
                   <LinkIcon size={16}/>
                 </button>
               </div>
               <p className="text-[10px] text-indigo-300 font-bold mt-2 text-center">{user.referralCount || 0} Friends Invited</p>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Total Submissions</p>
            <h2 className="text-4xl font-black text-slate-900">{posts.length}</h2>
          </div>
          <div className="flex gap-4 mt-4">
             <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm"><CheckCircle size={16}/> {posts.filter(p => p.status === PostStatus.APPROVED).length} Approved</div>
             <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm"><Clock size={16}/> {posts.filter(p => p.status === PostStatus.PENDING).length} Pending</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Submissions Section */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-sans text-3xl font-black flex items-center gap-3">
              <FileText className="text-primary" /> My Submissions
            </h2>
            <button 
              onClick={() => setShowSubmit(!showSubmit)}
              className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              {showSubmit ? <XCircle size={20}/> : <PlusCircle size={20} />}
              {showSubmit ? 'Cancel' : 'New Article'}
            </button>
          </div>

          {showSubmit && (
            <div className="bg-white rounded-3xl p-8 border shadow-xl mb-10 animate-in slide-in-from-top-4 duration-300">
              <form onSubmit={handleSubmitPost} className="space-y-6">
                
                {/* Image Upload Block */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Cover Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all group min-h-[200px]"
                    >
                      {selectedImage ? (
                        <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm">
                          <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                             <p className="text-white font-bold flex items-center gap-2"><Upload size={20}/> Change Image</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-primary mb-4 transition-colors shadow-sm mx-auto">
                            <ImageIcon size={32} />
                          </div>
                          <p className="text-slate-500 font-bold">Click to upload cover photo</p>
                          <p className="text-slate-400 text-xs font-medium mt-1">Supports JPG, PNG (Max 2MB)</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Article Title</label>
                  <input 
                    type="text" 
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    placeholder="Enter a compelling headline"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-bold text-slate-700"
                  >
                    {Object.values(Category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-2">Content</label>
                  <textarea 
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                    placeholder="Write your news story here..."
                  />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
                  Submit for Moderation (Max 5/day)
                </button>
              </form>
            </div>
          )}

          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border shadow-sm">
                <p className="text-slate-400 font-bold">You haven't submitted any articles yet.</p>
              </div>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover"/>
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-900 leading-tight mb-1">{p.title}</h4>
                        <div className="flex items-center gap-3">
                           <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-tighter">{p.category}</span>
                           <span className="text-[10px] text-slate-400 font-bold">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status === PostStatus.APPROVED && <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100"><CheckCircle size={14}/> Approved</span>}
                    {p.status === PostStatus.PENDING && <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-100"><Clock size={14}/> Pending</span>}
                    {p.status === PostStatus.REJECTED && <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100"><XCircle size={14}/> Rejected</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-xl mb-6">How to Earn?</h3>
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold shrink-0 text-xs">1</div>
                    <p className="text-slate-600 text-sm font-medium">Read articles for 30s to earn <span className="text-primary font-bold">K0.20</span></p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold shrink-0 text-xs">2</div>
                    <p className="text-slate-600 text-sm font-medium">Comment on a post for <span className="text-primary font-bold">K0.20</span></p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold shrink-0 text-xs">3</div>
                    <p className="text-slate-600 text-sm font-medium">Login daily for a guaranteed <span className="text-primary font-bold">K5.00</span></p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold shrink-0 text-xs">4</div>
                    <p className="text-slate-600 text-sm font-medium">Write news (max 5/day) to earn <span className="text-primary font-bold">K10.00</span> per approval</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 text-xs">5</div>
                    <p className="text-slate-600 text-sm font-medium">Refer friends to earn <span className="text-indigo-600 font-bold">K50.00</span> per signup</p>
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};