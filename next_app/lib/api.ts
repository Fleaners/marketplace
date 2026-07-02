const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://marketplace-store-fef91.web.app';

export async function getBuyerRecommendations(uid = '') {
  const params = new URLSearchParams();
  if (uid) params.set('uid', uid);
  params.set('limit', '8');
  const res = await fetch(`${API_BASE}/api/recommendations/buyer?${params.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    return { recommendations: [], insights: [] } as const;
  }
  return res.json();
}
