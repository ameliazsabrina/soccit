"use client";

import { useParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import { WorldCupBracket } from "./world-cup-bracket";

const UCL_LOGO_WHITE = "/api/assets/assets/events/ucl-logo-white.svg";

export default function EventPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  if (slug === "worldcup") return <WorldCupBracket />;

  if (slug === "ucl") {
    return (
      <PageShell variant="worldcup" fullWidth hideTicker>
        <div className="flex flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-8">
          <EventHeader
            logo={UCL_LOGO_WHITE}
            title="UEFA Champions League"
            subtitle="Knockout predictions"
          />
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden border border-white/10 bg-white/5 px-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center border border-wc-cyan/40 bg-wc-cyan/10">
              <Trophy aria-hidden="true" className="text-wc-cyan" size={36} />
            </div>
            <h2 className="font-wc mt-6 text-4xl text-white sm:text-5xl">
              Coming soon
            </h2>
            <p className="font-wc-support mt-3 max-w-md text-sm leading-6 text-white/70">
              The Champions League bracket opens when the knockout field is confirmed.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell variant="worldcup" fullWidth hideTicker>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-wc text-4xl text-white">Event not found</h1>
        <p className="font-wc-support mt-2 text-sm text-white/70">
          Return to matches to explore active events.
        </p>
      </div>
    </PageShell>
  );
}

function EventHeader({
  logo,
  title,
  subtitle,
}: {
  logo: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col items-center py-8 text-center sm:py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" className="h-16 w-16 object-contain" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-wc-cyan">
        {subtitle}
      </p>
      <h1 className="font-wc mt-2 text-4xl text-white sm:text-5xl">{title}</h1>
    </header>
  );
}
