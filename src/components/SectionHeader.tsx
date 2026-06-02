import { GearSix } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { quickSpring, softSpring } from "@/lib/motion";

type SectionHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div className="section-header" layout="position" transition={softSpring}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action ?? (
        <motion.button
          type="button"
          aria-label={`${title} settings`}
          whileHover={shouldReduceMotion ? undefined : { rotate: 12 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
          transition={quickSpring}
        >
          <GearSix weight="fill" />
        </motion.button>
      )}
    </motion.div>
  );
}
