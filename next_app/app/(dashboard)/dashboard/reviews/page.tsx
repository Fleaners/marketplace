'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { navigationItems } from '@/lib/navigation';

interface Review {
  id: string;
  reviewerName: string;
  reviewerCompany: string;
  rating: number;
  date: string;
  text: string;
  productName: string;
  reply?: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_reviews');
      if (stored) {
        setReviews(JSON.parse(stored));
      } else {
        const defaultReviews: Review[] = [
          {
            id: 'REV-01',
            reviewerName: 'Girish Deshmukh',
            reviewerCompany: 'Deshmukh Agri Products',
            rating: 5,
            date: '2026-07-02T10:00:00Z',
            text: 'Extremely robust water pump! Standard copper wiring gives excellent heat dissipation. Highly recommend Girish for high pressure crop irrigation cycles.',
            productName: 'Industrial Water Pump',
            reply: 'Thank you Girish for the positive feedback! We engineer our centrifugal pumps for deep agricultural duty cycles.',
          },
          {
            id: 'REV-02',
            reviewerName: 'Priya Patel',
            reviewerCompany: 'Vibrant Glass & Glazing',
            rating: 4,
            date: '2026-06-30T11:40:00Z',
            text: 'Heavy duty adhesive polyurethane did its job wonderfully in our curtain-wall structural bonding project. Only improvement could be setting speed, takes about 24 hours to cure fully.',
            productName: 'Heavy Duty Adhesive Sealant',
          },
          {
            id: 'REV-03',
            reviewerName: 'Harsh Vardhan',
            reviewerCompany: 'Vardhan Solar Installers',
            rating: 5,
            date: '2026-06-25T15:20:00Z',
            text: 'Conforming Copper Wire arrived packaged neatly on secure wooden spools. Checked insulation thickness using digital calipers, ISI certified thickness meets specifications perfectly.',
            productName: 'Copper Core Grounding Wire',
            reply: 'We appreciate the systematic check Harsh. Product safety and raw copper purity are top priorities for us.',
          },
        ];
        localStorage.setItem('marketplace_reviews', JSON.stringify(defaultReviews));
        setReviews(defaultReviews);
      }
    } catch (e) {
      console.error('Failed to load reviews from storage', e);
    }
  }, []);

  const saveReviewsToStorage = (updated: Review[]) => {
    setReviews(updated);
    localStorage.setItem('marketplace_reviews', JSON.stringify(updated));
  };

  const handlePostReply = (id: string) => {
    if (!replyText.trim()) return;

    const updated = reviews.map((r) => {
      if (r.id === id) {
        return { ...r, reply: replyText.trim() };
      }
      return r;
    });

    saveReviewsToStorage(updated);
    setActiveReplyId(null);
    setReplyText('');
  };

  const getStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#1f2937] dark:text-white tracking-tight">
              Buyer Reviews & Testimonials
            </h1>
            <p className="text-slate-505 dark:text-slate-400 text-sm mt-1">
              Verify supplier credentials, review direct testimonials, and maintain premium trust ratings.
            </p>
          </div>
        </div>

        {/* Aggregate Ratings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1 rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aggregate Score</p>
            <p className="text-5xl font-black text-[#1f2937] dark:text-white">4.8</p>
            <div className="text-amber-405 text-lg font-bold">{getStars(5)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Based on 14 B2B ratings</p>
          </Card>

          <Card className="md:col-span-3 rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider">Supplier Trust Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
              <div className="p-3.5 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 text-center space-y-1">
                <span className="text-xl">🏆</span>
                <p className="text-slate-700 dark:text-slate-205 font-bold">100% Response Rate</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Average reply within 1 hour</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 text-center space-y-1">
                <span className="text-xl">🏅</span>
                <p className="text-slate-700 dark:text-slate-205 font-bold">GST Verified Seller</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Verified corporate profile</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 text-center space-y-1">
                <span className="text-xl">🤝</span>
                <p className="text-slate-700 dark:text-slate-205 font-bold">90%+ Positive Feedback</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Elite merchant milestone</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Reviews Feed */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#1f2937] dark:text-white">Buyer Testimonials Feed</h3>

          {reviews.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-[#f3d9a7] dark:border-slate-800">
              <p className="text-2xl">⭐</p>
              <p className="text-xs font-semibold mt-2">No buyer reviews registered yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <Card key={rev.id} className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
                  {/* Testimonial Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#f3d9a7] dark:border-slate-800 pb-3">
                    <div>
                      <div className="font-bold text-[#1f2937] dark:text-white text-base">{rev.reviewerName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{rev.reviewerCompany}</div>
                    </div>
                    <div className="text-right sm:text-right">
                      <div className="text-amber-400 text-sm font-bold">{getStars(rev.rating)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {new Date(rev.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Content */}
                  <div className="space-y-1.5">
                    <span className="inline-flex rounded-full bg-[#fff6e6] dark:bg-slate-950 px-2.5 py-0.5 text-[9px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-widest border border-[#f3d9a7] dark:border-slate-800">
                      Product: {rev.productName}
                    </span>
                    <p className="text-slate-650 dark:text-slate-300 text-sm leading-relaxed">{rev.text}</p>
                  </div>

                  {/* Existing Reply */}
                  {rev.reply && (
                    <div className="p-4 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 border-l-2 border-l-accent-500 space-y-1">
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Supplier Response ✓</p>
                      <p className="text-slate-650 dark:text-slate-350 text-xs leading-relaxed italic">"{rev.reply}"</p>
                    </div>
                  )}

                  {/* Active Reply Action Box */}
                  {!rev.reply && (
                    <div>
                      {activeReplyId === rev.id ? (
                        <div className="p-4 rounded-2xl border border-dashed border-[#f3d9a7] dark:border-slate-800 bg-[#fff0db]/50 dark:bg-slate-950/20 space-y-3 animate-fade-in">
                          <p className="text-xs font-bold text-[#1f2937] dark:text-white uppercase tracking-widest">Compose Response</p>
                          <textarea
                            rows={3}
                            placeholder="Type response as verified merchant..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full rounded-xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 px-3 py-2 text-xs text-[#1f2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none font-semibold"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setActiveReplyId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1.5 text-xs rounded-xl"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handlePostReply(rev.id)}
                              className="px-4 py-1.5 text-xs rounded-xl bg-[#FAB12F] text-slate-950 font-bold"
                            >
                              Post Response
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveReplyId(rev.id);
                            setReplyText('');
                          }}
                          className="text-xs font-bold text-amber-600 hover:text-accent-300 transition-colors flex items-center gap-1"
                        >
                          💬 Reply as Supplier
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
