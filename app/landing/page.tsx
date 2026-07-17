import type { Metadata } from "next";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { LandingHero } from "./_components/landing-hero";
import { HowItWorks } from "./_components/how-it-works";
import { CardsGallery } from "./_components/cards-gallery";
import { LeaderboardTeaser } from "./_components/leaderboard-teaser";
import { CTASection } from "./_components/cta-section";
import { PageLoader } from "./_components/page-loader";
import { SmoothScroll } from "./_components/smooth-scroll";
import { LandingExperienceChrome, LandingExperienceProvider } from "./_components/landing-experience";

export const metadata: Metadata = {
  title: "Soccit — Gamified Football Prediction Market on Solana",
  description: "Predict the score. Pitch the subs. Lock it on-chain. Win the pool.",
};

const LANDING_AUDIO_EXTENSION = /\.(mp3|m4a|ogg|wav)$/i;

async function getLandingAudioTracks() {
  try {
    const directory = path.join(process.cwd(), "public", "assets", "audio");
    const files = await readdir(directory);
    return files
      .filter((file) => LANDING_AUDIO_EXTENSION.test(file))
      .sort()
      .map((file) => `/assets/audio/${encodeURIComponent(file)}`);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const audioTracks = await getLandingAudioTracks();

  return (
    <LandingExperienceProvider>
      <PageLoader />
      <LandingExperienceChrome audioTracks={audioTracks} />
      <SmoothScroll>
        <main id="top" className="landing-cinematic relative overflow-x-hidden bg-background text-foreground">
          <LandingHero />
          <HowItWorks />
          <LeaderboardTeaser />
          <CardsGallery />
          <CTASection />
        </main>
      </SmoothScroll>
    </LandingExperienceProvider>
  );
}
