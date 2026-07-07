export type SellerPlan = 'standard' | 'premium';
export type UserRole = 'buyer' | 'seller';

export interface PlanCapabilities {
  plan: SellerPlan;
  maxImagesPerProduct: number;
  richTextDescriptions: boolean;
  aiDescriptions: boolean;
  advancedAnalytics: boolean;
  customThemes: boolean;
  multipleBanners: boolean;
  prioritySearchRanking: boolean;
  promotionalTools: boolean;
  earlyAccess: boolean;
  premiumSupport: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  subscriptionPlan: SellerPlan;
  email?: string;
  profileImage?: string;
  coverImage?: string;
  verified: boolean;
  businessName: string;
  bio: string;
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    website?: string;
  };
  shippingAddresses?: ShippingAddress[];
  wishlist?: string[];
  reviewHistory?: BuyerReview[];
  orderTracking?: OrderStatus[];
}

export interface ProductAnalytics {
  views: number;
  salesCount: number;
  conversionRate?: number;
  revenue?: number;
  customerInsights?: string[];
  trafficSources?: Record<string, number>;
}

export interface ProductRecord {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  richDescription?: string;
  images: string[];
  features: string[];
  specifications: Record<string, string>;
  categories: string[];
  tags: string[];
  analytics: ProductAnalytics;
  featured: boolean;
  updatedAt: string;
}

export interface ShippingAddress {
  id: string;
  recipient: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface BuyerReview {
  id: string;
  productTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface OrderStatus {
  orderId: string;
  title: string;
  status: 'processing' | 'packed' | 'shipped' | 'delivered';
  eta: string;
}
