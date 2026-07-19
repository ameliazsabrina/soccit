"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

interface PageTransitionProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: React.ReactNode;
  delay?: number;
}

export function PageTransition({ children, delay = 0, className, ...rest }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}