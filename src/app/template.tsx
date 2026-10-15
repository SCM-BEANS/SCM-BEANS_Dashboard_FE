"use client";

import { motion } from "motion/react";

export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <motion.div
      className="route-motion"
      initial={{ opacity: 0, y: 7, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
