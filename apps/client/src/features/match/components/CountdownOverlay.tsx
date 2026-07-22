import { AnimatePresence, motion } from "framer-motion";
import { countdownPop } from "@/shared/animations/variants";

export function CountdownOverlay({ value }: { value: number | null }) {
  if (value === null) return null;

  return (
    <div className="flex items-center justify-center py-8" role="status" aria-live="assertive">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          variants={countdownPop}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="font-display text-display-xl font-bold text-text-primary"
        >
          {value === 0 ? "GO!" : value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
