
export enum Category {
  POLITICS = 'Politics',
  SPORTS = 'Sports',
  ENTERTAINMENT = 'Entertainment',
  BUSINESS = 'Business',
  TECH = 'Tech'
}

export enum PostStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface Beneficiary {
  id: string;
  name: string;
  number: string;
  provider: string;
}

export interface User {
  id: string;
  phoneNumber: string;
  username: string;
  email: string;
  password?: string;
  points: number; // Activity Earnings
  referralEarnings: number; // Referral Earnings (Separate)
  referralCode: string; // Unique code for the user
  referralCount: number; // How many people they invited
  inviteCodeUsed?: string;
  isAdmin: boolean;
  lastLoginDate?: string; // YYYY-MM-DD
  readPosts: string[]; // List of post IDs
  commentedPosts: string[]; // List of post IDs
  savedBeneficiaries?: Beneficiary[];
}

export interface Post {
  id: string;
  title: string;
  category: Category;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  status: PostStatus;
  imageUrl?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  username: string;
  amount: number;
  source: 'ACTIVITY' | 'REFERRAL'; // New field to distinguish wallets
  details: string;
  status: 'Pending' | 'Paid' | 'Rejected';
  createdAt: string;
}

export interface Announcement {
  id: string;
  text: string;
  active: boolean;
}

export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  used: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'EARN' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'REFUND' | 'REFERRAL_BONUS';
  description: string;
  createdAt: string;
}
