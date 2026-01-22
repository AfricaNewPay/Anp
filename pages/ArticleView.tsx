import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DB, generateUUID } from '../services/db';
import { Post, User, Comment } from '../types';
import { Clock, MessageSquare, ShieldAlert, CheckCircle, Send, AlertCircle, Coins } from 'lucide-react';

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // Using any to avoid 'Cannot find namespace NodeJS' error in browser environment
  const timerRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
        const posts = await DB.getPosts();
        const p = posts.find(x => x.id === id);
        if (!p) {
          navigate('/');
          return;
        }
        setPost(p);
        
        // Load initial user state
        const currentUser = DB.getCurrentUser();
        setUser(currentUser);
        
        const allComments = await DB.getComments();
        setComments(allComments.filter(c => c.postId === id));

        if (currentUser) {
          const alreadyClaimed = currentUser.readPosts.includes(id!);
          setHasClaimed(alreadyClaimed);
          if (!alreadyClaimed) {
            setIsTimerActive(true);
          }
        }
    };

    fetchData();

    // Listen for global user updates
    const handleUserUpdate = () => {
        const updated = DB.getCurrentUser();
        setUser(updated);
        if (updated && id && updated.readPosts.includes(id)) {
            setHasClaimed(true);
            setIsTimerActive(false);
        }
    };
    window.addEventListener('afnp-user-change', handleUserUpdate);
    return () => window.removeEventListener('afnp-user-change', handleUserUpdate);

  }, [id, navigate]);

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timeLeft]);

  // Auto-dismiss message logic
  useEffect(() => {
    if (message) {
      setIsFadingOut(false);
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 4000);

      const removeTimer = setTimeout(() => {
        setMessage(null);
      }, 4500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [message]);

  const handleClaimPoints = async () => {
    if (timeLeft > 0 || !id || !user) return;
    
    // Updated reading reward: K0.20
    const result = await DB.addPoints(user.id, 0.20, 'READ', id);

    if (result.success) {
      setHasClaimed(true);
      setMessage({ type: 'success', text: result.message });
    } else {
      setHasClaimed(true); // Ensure UI reflects state if already claimed
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get fresh user to avoid stale state in closure
    const freshUser = DB.getCurrentUser();
    if (!freshUser || !id || !newComment.trim()) return;

    // 1. Save Comment
    const comment: Comment = {
      id: generateUUID(),
      postId: id,
      userId: freshUser.id,
      username: freshUser.username,
      text: newComment,
      createdAt: new Date().toISOString()
    };

    const success = await DB.addComment(comment);
    if(success) {
       setComments([...comments, comment]);
       setNewComment('');

       // 2. Award Points: K0.20 for comment
       const result = await DB.addPoints(freshUser.id, 0.20, 'COMMENT', id);
    
       if (result.success) {
         setMessage({ type: 'success', text: 'Comment posted! You earned K0.20.' });
       } else {
         setMessage({ type: 'success', text: 'Comment posted!' });
       }
    } else {
       setMessage({ type: 'error', text: 'Failed to post comment.' });
    }
  };

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Floating Notification Toast */}
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-[90vw] p-4 rounded-2xl flex items-center gap-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border transition-all duration-500 ${isFadingOut ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0 animate-in slide-in-from-top-4 fade-in duration-300'} ${message.type === 'success' ? 'bg-white border-green-500/20' : 'bg-white border-red-500/20'}`}>
          <div className={`p-3 rounded-full shrink-0 shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
             {message.type === 'success' ? <Coins size={28} className="drop-shadow-sm" /> : <AlertCircle size={28} />}
          </div>
          <div>
             <p className={`font-black text-lg leading-tight ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
               {message.type === 'success' ? 'Earnings Updated!' : 'Notice'}
             </p>
             <p className="font-bold text-slate-500 text-sm mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      <article className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border mb-12">
        <div className="aspect-[21/9] w-full relative">
          <img src={post.imageUrl || `https://picsum.photos/1200/600?random=${post.id}`} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-6 left-8 right-8">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">
              {post.category}
            </span>
            <h1 className="font-sans text-3xl md:text-5xl font-black text-white leading-tight">
              {post.title}
            </h1>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-6 mb-8 text-slate-500 font-medium border-b pb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold">
                {post.authorName[0]}
              </div>
              <span className="text-slate-900 font-bold">{post.authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span>{comments.length} Comments</span>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed mb-12">
            {post.content.split('\n').map((para, i) => (
              <p key={i} className="mb-6">{para}</p>
            ))}
          </div>

          {/* Reward Section */}
          <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200 text-center">
            {user ? (
              hasClaimed ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="text-primary w-12 h-12" />
                  <h3 className="text-xl font-bold text-slate-900">Funds Claimed</h3>
                  <p className="text-slate-500 font-medium">You have already earned K0.20 for reading this article.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ShieldAlert className="text-accent w-12 h-12" />
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Anti-Farming Reward</h3>
                    <p className="text-slate-600 font-medium mt-1">Read the full article to claim your rewards.</p>
                  </div>
                  
                  <button 
                    disabled={timeLeft > 0}
                    onClick={handleClaimPoints}
                    className={`px-10 py-4 rounded-2xl font-black text-lg shadow-xl transition-all ${
                      timeLeft > 0 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-primary text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {timeLeft > 0 ? `Wait ${timeLeft}s to Claim` : 'Claim K0.20 Now'}
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-4">
                 <h3 className="text-xl font-bold">Want to earn money for reading?</h3>
                 <Link to="/signup" className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg">Join Africa News Pay</Link>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border">
        <h2 className="font-sans text-3xl font-black mb-10 flex items-center gap-3">
          <MessageSquare className="text-primary" /> Community Discussion
        </h2>

        {user ? (
          <form onSubmit={handleComment} className="mb-12">
            <div className="relative">
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full h-32 bg-slate-50 rounded-2xl p-6 font-medium text-slate-900 border border-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none"
                required
              />
              <button 
                type="submit"
                className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-bold"
              >
                Post <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 font-bold tracking-wider uppercase"> Earn K0.20 for your first comment on this post.</p>
          </form>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-6 text-center border mb-12">
             <p className="font-bold text-slate-600 mb-4">You must be logged in to participate in the discussion.</p>
             <Link to="/login" className="text-primary font-bold hover:underline">Log in now</Link>
          </div>
        )}

        <div className="space-y-8">
          {comments.length === 0 ? (
            <p className="text-center text-slate-400 font-medium italic">No comments yet. Be the first to start the conversation!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0 shadow-sm border border-white">
                  {c.username[0]}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-900">{c.username}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      {new Date(c.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 md:p-6 text-slate-700 font-medium shadow-sm border border-slate-100">
                    {c.text}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};