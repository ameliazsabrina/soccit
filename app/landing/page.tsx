import type { Metadata } from "next";
import { LandingHero } from "./_components/landing-hero";
import { HowItWorks } from "./_components/how-it-works";
import { CardsGallery } from "./_components/cards-gallery";
import { LeaderboardTeaser } from "./_components/leaderboard-teaser";
import { CTASection } from "./_components/cta-section";
import { ScrollProgress } from "./_components/scroll-progress";
import { PageLoader } from "./_components/page-loader";
import { SmoothScroll } from "./_components/smooth-scroll";
import { BottomNav } from "./_components/bottom-nav";

export const metadata: Metadata = {
  title: "Soccit — Gamified Football Prediction Market on Solana",
  description: "Predict the score. Pitch the subs. Lock it on-chain. Win the pool.",
};

export default function LandingPage() {
  return (
    <>
      <PageLoader />
      <ScrollProgress />
      <SmoothScroll>
        <main id="top" className="relative bg-background text-foreground overflow-x-hidden">
          <LandingHero />
          <HowItWorks />
          <CardsGallery />
          <LeaderboardTeaser />
          <CTASection />
        </main>
      </SmoothScroll>
      <BottomNav />
    </>
  );
}
