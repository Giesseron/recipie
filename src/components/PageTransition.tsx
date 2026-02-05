"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/lib/motion";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
