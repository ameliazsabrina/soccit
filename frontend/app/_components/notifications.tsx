"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, CheckCircle2, X, Info } from "lucide-react";
import { cn } from "../_lib/utils";

export type NotificationType = "error" | "info" | "success" | "warning" | "loading";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // ms; 0 = sticky (no auto-dismiss)
  link?: { href: string; label: string };
}

interface NotificationsProps {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<NotificationType, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  error: {
    border: "border-rose/40",
    bg: "bg-rose/10",
    text: "text-rose",
    icon: <AlertCircle size={16} className="flex-shrink-0" />,
  },
  warning: {
    border: "border-gold/40",
    bg: "bg-gold/10",
    text: "text-gold",
    icon: <AlertCircle size={16} className="flex-shrink-0" />,
  },
  info: {
    border: "border-cyan/40",
    bg: "bg-cyan/10",
    text: "text-cyan",
    icon: <Info size={16} className="flex-shrink-0" />,
  },
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    icon: <CheckCircle2 size={16} className="flex-shrink-0" />,
  },
  loading: {
    border: "border-cyan/40",
    bg: "bg-cyan/10",
    text: "text-cyan",
    icon: <Loader2 size={16} className="flex-shrink-0 animate-spin" />,
  },
};

function NotificationCard({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  const style = TYPE_STYLES[item.type];

  useEffect(() => {
    if (item.duration === 0 || item.type === "loading") return;
    const timer = setTimeout(() => onDismiss(item.id), item.duration ?? 4500);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "pointer-events-auto relative w-80 border p-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]",
        style.border,
        style.bg
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5", style.text)}>{style.icon}</span>
        <div className="min-w-0 flex-1">
          {item.title && (
            <p className={cn("text-xs font-bold uppercase tracking-wider", style.text)}>
              {item.title}
            </p>
          )}
          <p className="text-sm text-foreground break-words">{item.message}</p>
          {item.link && (
            <a
              href={item.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs text-cyan hover:underline"
            >
              {item.link.label} ↗
            </a>
          )}
        </div>
        {item.type !== "loading" && (
          <button
            onClick={() => onDismiss(item.id)}
            className="flex-shrink-0 text-muted transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function Notifications({ items, onDismiss }: NotificationsProps) {
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[90] flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <NotificationCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const push = useCallback((item: Omit<NotificationItem, "id"> & { id?: string }) => {
    const id = item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => {
      const filtered = item.id ? prev.filter((n) => n.id !== item.id) : prev;
      return [...filtered, { ...item, id }];
    });
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<NotificationItem, "id">>) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  return { items, push, update, dismiss, clearAll };
}
