"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getUser, type UserProfile } from "./api";

export const PROFILE_UPDATED_EVENT = "soccit:profile-updated";

export function useConnectedProfile() {
  const { publicKey, connected } = useWallet();
  const wallet = connected ? publicKey?.toBase58() ?? null : null;
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!wallet) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setProfile(null);

    getUser(wallet)
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    const handleProfileUpdated = (event: Event) => {
      const nextProfile = (event as CustomEvent<UserProfile>).detail;
      if (nextProfile?.wallet === wallet) setProfile(nextProfile);
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [wallet]);

  return profile;
}
