'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth-store';
import { NavBar } from '../../components/landing/nav-bar';
import { Hero } from '../../components/landing/hero';
import { FeaturesGrid } from '../../components/landing/features-grid';
import { PricingSection } from '../../components/landing/pricing-section';
import { Footer } from '../../components/landing/footer';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  // 로그인 사용자 → 워크스페이스 선택 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/workspaces');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MarkFlow',
    description: '마크다운 기반 팀 지식 관리 플랫폼',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    author: { '@type': 'Organization', name: 'MarkFlow Team' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-[#F8F7F4]">
        <NavBar />
        <main>
          <Hero />
          <FeaturesGrid />
          <PricingSection />
        </main>
        <Footer />
      </div>
    </>
  );
}
