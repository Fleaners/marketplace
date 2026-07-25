'use client';

import React, { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { subscribeUserProfile } from '@/lib/marketplace/firestore';
import type { UserProfile } from '@/lib/marketplace/types';

export interface GreetingProps {
  subtitleOverride?: string;
  className?: string;
}

export function Greeting({ subtitleOverride, className = '' }: GreetingProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [greetingText, setGreetingText] = useState('Welcome Back');
  const [path, setPath] = useState('');

  // 1. Calculate dynamic time-based greeting prefix
  useEffect(() => {
    const updateTimeGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreetingText('Good Morning');
      } else if (hour >= 12 && hour < 17) {
        setGreetingText('Good Afternoon');
      } else if (hour >= 17 && hour < 22) {
        setGreetingText('Good Evening');
      } else {
        setGreetingText('Welcome Back');
      }
    };
    updateTimeGreeting();
    // Re-check hourly
    const timer = setInterval(updateTimeGreeting, 3600000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch path name safely for dynamic subtitles
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPath(window.location.pathname);
    }
  }, []);

  // 3. Setup real-time listener for current user's profile
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let active = true;

    // Load initial fast cached profile from local storage to avoid layout shifts
    try {
      const stored = localStorage.getItem('mp_user') || 
                     localStorage.getItem('marketplace_seller_profile') ||
                     localStorage.getItem('marketplace_buyer_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setProfile(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Failed to load initial cached profile:', e);
    }

    getFirebaseServices().then((services) => {
      if (!active || !services?.auth) return;

      const authUnsub = services.auth.onAuthStateChanged((user) => {
        if (!active) return;
        if (user) {
          setAuthDisplayName(user.displayName);
          // Subscribe to real-time changes
          if (unsubscribe) unsubscribe();
          unsubscribe = subscribeUserProfile(user.uid, (updatedProfile) => {
            if (!active) return;
            setProfile(updatedProfile);
            setLoading(false);
            // Sync to cache
            try {
              localStorage.setItem('mp_user', JSON.stringify(updatedProfile));
            } catch (e) {}
          });
        } else {
          setProfile(null);
          setAuthDisplayName(null);
          setLoading(false);
        }
      });

      return () => {
        authUnsub();
      };
    }).catch((err) => {
      console.error('Failed to initialize Firebase Auth for greeting:', err);
      setLoading(false);
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 4. Resolve name priority
  const getPersonalizedName = (): string | null => {
    if (profile) {
      // 1. Seller Business Name
      if (profile.businessName && profile.businessName.trim()) {
        const name = profile.businessName.trim();
        if (!/^(user\d+|anonymous|unknown|null|undefined)$/i.test(name)) {
          return name;
        }
      }
      // 2. User Display Name / name field if present
      const anyName = (profile as any).displayName || (profile as any).name;
      if (anyName && anyName.trim()) {
        const name = anyName.trim();
        if (!/^(user\d+|anonymous|unknown|null|undefined)$/i.test(name)) {
          return name.split(' ')[0]; // Return first name
        }
      }
    }
    // 3. Auth Display Name fallback
    if (authDisplayName && authDisplayName.trim()) {
      const name = authDisplayName.trim();
      if (!/^(user\d+|anonymous|unknown|null|undefined)$/i.test(name)) {
        return name.split(' ')[0];
      }
    }
    return null;
  };

  const name = getPersonalizedName();
  const title = name ? `${greetingText}, ${name} 👋` : 'Welcome Back 👋';

  // Determine premium supporting subtitle based on route path
  const getSubtitle = () => {
    if (subtitleOverride) return subtitleOverride;
    if (path.includes('/dashboard/ai-insights')) {
      return "Here's what's happening in your marketplace today.";
    }
    if (path.includes('/dashboard/analytics')) {
      return 'Analyze your performance metrics in real-time.';
    }
    if (path.includes('/dashboard/inventory')) {
      return 'Manage and update your stock availability live.';
    }
    if (path.includes('/dashboard/profile')) {
      return 'Update your business credentials and branding settings.';
    }
    if (path.includes('/dashboard/advertising')) {
      return 'Manage search ads campaigns and promotions.';
    }
    if (path.includes('/dashboard/products')) {
      return 'Add new items and manage your products catalog.';
    }
    if (path.includes('/dashboard')) {
      return 'Helping your business grow today.';
    }
    return 'Helping your business grow today.';
  };

  if (loading && !profile) {
    // Premium loading skeleton to prevent layout shift
    return (
      <div className={`space-y-2 animate-pulse ${className}`} style={{ minHeight: '64px' }}>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-2xl w-64" />
        <div className="h-4 bg-slate-150 dark:bg-slate-850 rounded-xl w-48" />
      </div>
    );
  }

  return (
    <div className={`space-y-1 transition-all duration-300 ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-850 dark:text-white leading-none font-display">
        {title}
      </h2>
      <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
        {getSubtitle()}
      </p>
    </div>
  );
}
