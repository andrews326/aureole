// src/components/chat/ReactionBurst.tsx

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReactionBurstProps {
  active: boolean;
}

const PARTICLE_COUNT = 8;

const ReactionBurst: React.FC<ReactionBurstProps> = ({ active }) => {
  const [instanceKey, setInstanceKey] = useState(0);

  useEffect(() => {
    if (active) {
      setInstanceKey((k) => k + 1);
    }
  }, [active]);

  if (!active) return null;

  const particles = Array.from({ length: PARTICLE_COUNT });

  return (
    <AnimatePresence>
      <motion.div
        key={instanceKey}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      >
        {particles.map((_, i) => {
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const distance = 12 + (i % 3) * 4;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;

          return (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-yellow-300/80"
              initial={{ x: 0, y: 0, scale: 0 }}
              animate={{ x, y, scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            />
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

export default ReactionBurst;