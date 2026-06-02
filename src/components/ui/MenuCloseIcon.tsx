"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MenuCloseIconProps {
  isOpen: boolean;
  size?: number;
  color?: string;
  className?: string;
}

export function MenuCloseIcon({
  isOpen,
  size = 40,
  color = "currentColor",
  className,
}: MenuCloseIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("", className)}
      style={{ width: size, height: size }}
    >
      <motion.line
        x1="10"
        y1="12"
        x2="30"
        y2="12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={
          isOpen
            ? { y1: 20, y2: 20, rotate: 45 }
            : { y1: 12, y2: 12, rotate: 0 }
        }
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10"
        y1="20"
        x2="30"
        y2="20"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10"
        y1="28"
        x2="30"
        y2="28"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        animate={
          isOpen
            ? { y1: 20, y2: 20, rotate: -45 }
            : { y1: 28, y2: 28, rotate: 0 }
        }
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: "20px 20px" }}
      />
    </svg>
  );
}
