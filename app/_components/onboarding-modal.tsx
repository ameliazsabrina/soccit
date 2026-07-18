"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { X, Loader2, CheckCircle2, User } from "lucide-react";
import bs58 from "bs58";
import { createUserProfile, type AvatarId } from "../_lib/api";
import { storeSession } from "../_lib/session";
import { AvatarPicker } from "./avatar-picker";
import { cn } from "../_lib/utils";
import { PROFILE_UPDATED_EVENT } from "../_lib/use-connected-profile";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OnboardingModal({ open, onClose, onSuccess }: OnboardingModalProps) {
  const { publicKey, signMessage } = useWallet();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("avatar-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = publicKey?.toBase58();
  const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !signMessage || !isValidUsername) return;

    setLoading(true);
    setError(null);

    try {
      const message = `Soccit onboarding: ${wallet}`;
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      const result = await createUserProfile({
        wallet,
        username,
        avatar,
        message,
        signature,
      });

      // Onboarding already proved wallet ownership — persist the session so the
      // user can edit their profile later without signing again.
      if (result.session) storeSession(wallet, result.session);

      window.dispatchEvent(
        new CustomEvent(PROFILE_UPDATED_EVENT, { detail: result }),
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/60"
          />
          <motion.div
            layout
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="mb-6 px-8 pt-8">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Step 2 of 2
              </p>
              <h2 className="font-display text-3xl text-foreground">Create Manager Profile</h2>
              <p className="mt-1 text-sm text-muted">
                Pick a username and avatar to compete on the leaderboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
                  Username
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="manager_name"
                    maxLength={20}
                    className={cn(
                      "h-12 w-full border bg-background pl-10 pr-4 text-foreground placeholder:text-muted focus:outline-none focus:ring-2",
                      isValidUsername
                        ? "border-purple focus:ring-purple"
                        : "border-surface focus:ring-cyan"
                    )}
                  />
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
                  3–20 characters, letters/numbers/underscores only
                </p>
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-muted">
                  Choose Avatar
                </label>
                <AvatarPicker value={avatar} onChange={setAvatar} />
              </div>

              {error && (
                <div className="flex items-start gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
                  <X size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!isValidUsername || loading}
                className={cn(
                  "flex w-full items-center justify-center gap-2 py-4 font-display text-lg uppercase tracking-[0.1em] transition-all",
                  isValidUsername && !loading
                    ? "btn-gradient text-white"
                    : "cursor-not-allowed bg-surface text-muted"
                )}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {loading ? "Creating…" : "Sign & Create Profile"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
