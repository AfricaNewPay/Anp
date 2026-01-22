import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DB } from '../services/db';
import { Post, Category, PostStatus } from '../types';
import { Clock, ChevronRight, Users, Banknote } from 'lucide-react';

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPaid: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const activeCategory = searchParams.get('category');

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        
        // Load Posts
        const allPosts = await DB.getPosts();
        const approvedPosts = allPosts.filter(p => p.status === PostStatus.APPROVED);
        
        if (activeCategory) {
          setPosts(approvedPosts.filter(p => p.category === activeCategory));
        } else {
          setPosts(approvedPosts);
        }

        // Load Efficient Stats
        const statsData = await DB.getStats();
        setStats({
          totalUsers: statsData.users,
          totalPaid: statsData.paid
        });
        
        setLoading(false);
    };

    fetchData();
  }, [activeCategory]);

  const toggleCategory = (cat: string) => {
    if (activeCategory === cat) {
       searchParams.delete('category');
       setSearchParams(searchParams);
    } else {
       setSearchParams({ category: cat });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Platform Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Members</p>
            <p className="text-xl font-black text-slate-900">{stats.totalUsers.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Banknote size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid to Date</p>
            <p className="text-xl font-black text-slate-900">K{stats.totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="mb-8">
         <div className="flex flex-wrap justify-center gap-2">
            <button 
               onClick={() => setSearchParams({})}
               className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border shadow-sm ${!activeCategory ? 'bg-[#1d9bf0] text-white border-[#1d9bf0]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
               All
            </button>
            {Object.values(Category).map((cat) => (
               <button 
                  key={cat} 
                  onClick={() => toggleCategory(cat)}
                  className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border shadow-sm ${activeCategory === cat ? 'bg-[#1d9bf0] text-white border-[#1d9bf0]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
               >
                  {cat}
               </button>
            ))}
         </div>
      </div>

      {/* Latest News Header */}
      <div className="mb-6 border-b border-slate-200 pb-2">
         <h1 className="font-sans text-3xl font-bold text-slate-900">Latest News</h1>
      </div>

      {/* News Feed */}
      <div className="space-y-6">
          {loading ? (
             <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 h-48 animate-pulse border border-slate-100">
                     <div className="h-6 w-3/4 bg-slate-100 rounded mb-4"></div>
                     <div className="h-4 w-full bg-slate-50 rounded mb-2"></div>
                     <div className="h-4 w-2/3 bg-slate-50 rounded"></div>
                  </div>
                ))}
             </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <div className="text-slate-300 mb-4 flex justify-center"><Clock size={48} /></div>
              <p className="text-xl font-bold text-slate-500">No news articles found.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100">
                <Link to={`/article/${post.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                     <span className="bg-blue-50 text-[#1d9bf0] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {post.category}
                     </span>
                     <span className="text-xs text-slate-400 font-bold">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <h2 className="font-sans text-xl font-bold mb-3 text-slate-900 leading-tight hover:text-[#1d9bf0] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-slate-600 text-base line-clamp-3 mb-4 leading-relaxed">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                        {post.authorName[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-500">{post.authorName}</span>
                    </div>
                    <span className="flex items-center text-[#1d9bf0] text-sm font-bold gap-1 group">
                      Read <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </article>
            ))
          )}
      </div>
    </div>
  );
};