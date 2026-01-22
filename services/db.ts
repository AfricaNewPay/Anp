import { User, Post, Category, PostStatus, Comment, Withdrawal, Announcement, InviteCode, Transaction } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  CURRENT_USER: 'afnp_current_user'
};

// --- UTILS ---

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// --- MAPPING HELPERS (Supabase snake_case <-> App camelCase) ---

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  username: u.username,
  email: u.email,
  phoneNumber: u.phone_number,
  password: u.password,
  points: Number(u.points),
  referralEarnings: Number(u.referral_earnings),
  referralCode: u.referral_code,
  referralCount: u.referral_count,
  inviteCodeUsed: u.invite_code_used,
  isAdmin: u.is_admin,
  readPosts: u.read_posts || [],
  commentedPosts: u.commented_posts || [],
  savedBeneficiaries: u.saved_beneficiaries || [],
  lastLoginDate: u.last_login_date
});

const mapUserToDB = (u: User) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  phone_number: u.phoneNumber,
  password: u.password,
  points: u.points,
  referral_earnings: u.referralEarnings,
  referral_code: u.referralCode,
  referral_count: u.referralCount,
  invite_code_used: u.inviteCodeUsed,
  is_admin: u.isAdmin,
  read_posts: u.readPosts,
  commented_posts: u.commentedPosts,
  saved_beneficiaries: u.savedBeneficiaries,
  last_login_date: u.lastLoginDate
});

const mapPostFromDB = (p: any): Post => ({
  id: p.id,
  title: p.title,
  category: p.category as Category,
  content: p.content,
  authorId: p.author_id,
  authorName: p.author_name,
  createdAt: p.created_at,
  status: p.status as PostStatus,
  imageUrl: p.image_url
});

const mapPostToDB = (p: Post) => ({
  id: p.id,
  title: p.title,
  category: p.category,
  content: p.content,
  author_id: p.authorId,
  author_name: p.authorName,
  created_at: p.createdAt,
  status: p.status,
  image_url: p.imageUrl
});

const mapCommentFromDB = (c: any): Comment => ({
  id: c.id,
  postId: c.post_id,
  userId: c.user_id,
  username: c.username,
  text: c.text,
  createdAt: c.created_at
});

const mapWithdrawalFromDB = (w: any): Withdrawal => ({
  id: w.id,
  userId: w.user_id,
  username: w.username,
  amount: Number(w.amount),
  source: w.source as 'ACTIVITY' | 'REFERRAL',
  details: w.details,
  status: w.status as 'Pending' | 'Paid' | 'Rejected',
  createdAt: w.created_at
});

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  userId: t.user_id,
  amount: Number(t.amount),
  type: t.type,
  description: t.description,
  createdAt: t.created_at
});

const mapInviteCodeFromDB = (i: any): InviteCode => ({
  id: i.id,
  code: i.code,
  createdBy: i.created_by,
  used: i.used
});

// --- API ---

export const DB = {
  // Sync wrapper to fetch latest user data and update localStorage
  refreshSession: async (): Promise<User | null> => {
    try {
      const current = DB.getCurrentUser();
      if (!current) return null;
      const { data, error } = await supabase.from('users').select('*').eq('id', current.id).single();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return null;
      }

      if (data) {
        const updated = mapUserFromDB(data);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
        return updated;
      }
    } catch (e) {
      console.error('Session refresh failed:', e);
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    window.dispatchEvent(new Event('afnp-user-change'));
  },

  logout: () => {
    DB.setCurrentUser(null);
  },

  getUsers: async (): Promise<User[]> => {
    // WARNING: Heavy query. Use for admin only.
    const { data } = await supabase.from('users').select('*');
    return (data || []).map(mapUserFromDB);
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return data ? mapUserFromDB(data) : null;
  },

  getUserByIdentifier: async (identifier: string): Promise<User | null> => {
    // Search by email OR phone number
    const qId = `"${identifier}"`;
    const { data } = await supabase.from('users').select('*')
       .or(`email.eq.${qId},phone_number.eq.${qId}`)
       .maybeSingle();
    return data ? mapUserFromDB(data) : null;
  },

  checkUserExists: async (username: string, email: string, phone: string): Promise<boolean> => {
     // Safe quoting for values to handle spaces or special characters
     const qUsername = `"${username}"`;
     const qEmail = `"${email}"`;
     const qPhone = `"${phone}"`;
     
     const { data, error } = await supabase.from('users').select('id')
       .or(`username.eq.${qUsername},email.eq.${qEmail},phone_number.eq.${qPhone}`)
       .limit(1);
     
     if (error) {
       console.error("Check user error", error);
       return false;
     }
     return data && data.length > 0;
  },

  getStats: async (): Promise<{users: number, paid: number}> => {
     // Efficient count without fetching all rows
     const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
     
     // Calculate total paid (Paid withdrawals)
     const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('status', 'Paid');
     const totalPaid = (withdrawals || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
     
     return { users: count || 0, paid: totalPaid };
  },

  createUser: async (user: User): Promise<{ success: boolean, message?: string }> => {
    const { error } = await supabase.from('users').insert(mapUserToDB(user));
    if (error) {
      console.error('Create User Error', error);
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  updateUser: async (user: User): Promise<boolean> => {
    const { error } = await supabase.from('users').update(mapUserToDB(user)).eq('id', user.id);
    if (!error) {
      // Update session if it's the logged in user
      const current = DB.getCurrentUser();
      if (current && current.id === user.id) {
        DB.setCurrentUser(user);
      }
      return true;
    }
    return false;
  },

  getPosts: async (): Promise<Post[]> => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDB);
  },

  createPost: async (post: Post): Promise<boolean> => {
    const { error } = await supabase.from('posts').insert(mapPostToDB(post));
    return !error;
  },

  updatePost: async (post: Post): Promise<boolean> => {
    const { error } = await supabase.from('posts').update(mapPostToDB(post)).eq('id', post.id);
    return !error;
  },

  getComments: async (): Promise<Comment[]> => {
    const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: true });
    return (data || []).map(mapCommentFromDB);
  },

  addComment: async (comment: Comment): Promise<boolean> => {
    const { error } = await supabase.from('comments').insert({
      id: comment.id,
      post_id: comment.postId,
      user_id: comment.userId,
      username: comment.username,
      text: comment.text,
      created_at: comment.createdAt
    });
    return !error;
  },

  getWithdrawals: async (): Promise<Withdrawal[]> => {
    const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
    return (data || []).map(mapWithdrawalFromDB);
  },

  createWithdrawal: async (withdrawal: Withdrawal): Promise<boolean> => {
    const { error } = await supabase.from('withdrawals').insert({
      id: withdrawal.id,
      user_id: withdrawal.userId,
      username: withdrawal.username,
      amount: withdrawal.amount,
      source: withdrawal.source,
      details: withdrawal.details,
      status: withdrawal.status,
      created_at: withdrawal.createdAt
    });
    return !error;
  },

  updateWithdrawal: async (withdrawal: Withdrawal): Promise<boolean> => {
    const { error } = await supabase.from('withdrawals').update({
      status: withdrawal.status,
      details: withdrawal.details
    }).eq('id', withdrawal.id);
    return !error;
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    const { data } = await supabase.from('announcements').select('*');
    return (data || []) as Announcement[];
  },

  saveAnnouncements: async (announcements: Announcement[]) => {
    const { error } = await supabase.from('announcements').upsert(announcements);
    if (!error) window.dispatchEvent(new Event('afnp-announcement-change'));
  },

  deleteAnnouncement: async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    window.dispatchEvent(new Event('afnp-announcement-change'));
  },

  getInviteCodes: async (): Promise<InviteCode[]> => {
    const { data } = await supabase.from('invite_codes').select('*');
    return (data || []).map(mapInviteCodeFromDB);
  },

  createInviteCode: async (code: InviteCode) => {
    await supabase.from('invite_codes').insert({
      id: code.id,
      code: code.code,
      created_by: code.createdBy,
      used: code.used
    });
  },

  // Helper to ensure SYSTEM_ROOT code exists for admin seeding
  ensureSystemCode: async () => {
      // Try to find it
      const { data } = await supabase.from('invite_codes').select('id').eq('code', 'SYSTEM_ROOT').maybeSingle();
      if (!data) {
          // It doesn't exist, create it.
          // Note: If multiple people try to seed at once, unique constraint might error, but 'upsert' or try/catch is safe.
          // We use simple insert and catch error just in case.
          const { error } = await supabase.from('invite_codes').insert({
              id: generateUUID(),
              code: 'SYSTEM_ROOT',
              created_by: 'system',
              used: true
          });
          if (error) console.log("Ensure system code result:", error);
      }
  },

  updateInviteCode: async (code: InviteCode) => {
    await supabase.from('invite_codes').update({ used: code.used }).eq('id', code.id);
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    return (data || []).map(mapTransactionFromDB);
  },

  logTransaction: async (transaction: Transaction) => {
    await supabase.from('transactions').insert({
      id: transaction.id,
      user_id: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      created_at: transaction.createdAt
    });
  },

  // Specialized Business Logic
  
  addPoints: async (userId: string, amount: number, type: 'READ' | 'COMMENT' | 'DAILY' | 'POST_APPROVED', refId?: string): Promise<{ success: boolean, message: string }> => {
    // 1. Fetch fresh user
    const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error || !userData) return { success: false, message: 'User not found' };
    
    const user = mapUserFromDB(userData);
    const today = new Date().toISOString().split('T')[0];

    // Rules
    if (type === 'DAILY') {
      if (user.lastLoginDate === today) {
        return { success: false, message: 'Already claimed today' };
      }
      user.lastLoginDate = today;
    } else if (type === 'READ' && refId) {
      if (user.readPosts.includes(refId)) {
        return { success: false, message: 'Already rewarded for this article' };
      }
      user.readPosts.push(refId);
    } else if (type === 'COMMENT' && refId) {
      if (user.commentedPosts.includes(refId)) {
        return { success: false, message: 'Already rewarded for commenting on this article' };
      }
      user.commentedPosts.push(refId);
    }

    // Apply Points
    user.points += amount;
    
    // Save
    const success = await DB.updateUser(user);
    if (!success) return { success: false, message: 'Database error' };

    // Log Transaction
    await DB.logTransaction({
      id: generateUUID(),
      userId: user.id,
      amount: amount,
      type: 'EARN',
      description: `${type} Reward ${refId ? `(ID: ${refId})` : ''}`,
      createdAt: new Date().toISOString()
    });

    return { success: true, message: `Earned K${amount.toFixed(2)}` };
  },

  adjustUserFunds: async (userId: string, amount: number, reason: string): Promise<boolean> => {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!userData) return false;

    const user = mapUserFromDB(userData);
    user.points += amount;

    const success = await DB.updateUser(user);
    if (success) {
      await DB.logTransaction({
        id: generateUUID(),
        userId: userId,
        amount: amount,
        type: 'ADJUSTMENT',
        description: reason,
        createdAt: new Date().toISOString()
      });
      return true;
    }
    return false;
  },

  resetUserPassword: async (userId: string, newPass: string): Promise<boolean> => {
     const { error } = await supabase.from('users').update({ password: newPass }).eq('id', userId);
     return !error;
  },

  deleteUser: async (userId: string): Promise<boolean> => {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    return !error;
  }
};