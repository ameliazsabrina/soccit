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
import { StadiumFrame } from "./_components/stadium-frame";

export const metadata: Metadata = {
  title: "Soccit — Gamified Football Prediction Market on Solana",
  description: "Predict the score. Pitch the subs. Lock it on-chain. Win the pool.",
};

export default function LandingPage() {
  return (
    <>
      <PageLoader />
      <ScrollProgress />
      <StadiumFrame />
      <SmoothScroll>
        <main id="top" className="landing-cinematic relative overflow-x-hidden bg-background text-foreground">
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
