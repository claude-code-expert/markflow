'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { NavBar } from '../components/landing/nav-bar';
import { Hero } from '../components/landing/hero';
import { FeaturesGrid } from '../components/landing/features-grid';
import { PricingSection } from '../components/landing/pricing-section';
import { Footer } from '../components/landing/footer';

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

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <NavBar />
      <Hero />
      <FeaturesGrid />
      <PricingSection />
      <Footer />
    </div>
  );
}
