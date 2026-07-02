import type { PlanCapabilities, SellerPlan } from './types';

export const PLAN_CAPABILITIES: Record<SellerPlan, PlanCapabilities> = {
  standard: {
    plan: 'standard',
    maxImagesPerProduct: 5,
    richTextDescriptions: false,
    aiDescriptions: false,
    advancedAnalytics: false,
    customThemes: false,
    multipleBanners: false,
    prioritySearchRanking: false,
    promotionalTools: false,
    earlyAccess: false,
    premiumSupport: false,
  },
  premium: {
    plan: 'premium',
    maxImagesPerProduct: 20,
    richTextDescriptions: true,
    aiDescriptions: true,
    advancedAnalytics: true,
    customThemes: true,
    multipleBanners: true,
    prioritySearchRanking: true,
    promotionalTools: true,
    earlyAccess: true,
    premiumSupport: true,
  },
};

export const STANDARD_FEATURES = [
  'Unlimited product listings',
  'Up to 5 images per product',
  'Basic seller profile',
  'Basic analytics (views and sales count)',
  'Standard seller badge',
  'Single storefront theme',
  'Basic product descriptions',
  'One store banner image',
];

export const PREMIUM_FEATURES = [
  'Unlimited product listings',
  'Up to 20 images per product',
  'Premium verified badge',
  'Rich text and AI descriptions',
  'Advanced analytics and revenue tracking',
  'Customer insights and traffic sources',
  'Custom themes and multi-banner storefront',
  'Priority ranking and promotional tools',
  'Early feature access and premium support',
];
