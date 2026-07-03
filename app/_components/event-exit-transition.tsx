"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WorldCupTransition } from "./worldcup-transition";

export function EventExitTransition() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(
    () => searchParams.get("event_exit") === "1"
  );

  useEffect(() => {
    if (searchParams.get("event_exit") === "1") {
      router.replace("/matches", { scroll: false });
    }
  }, [searchParams, router]);

  if (!show) return null;

  return <WorldCupTransition mode="exit" onComplete={() => setShow(false)} />;
}
