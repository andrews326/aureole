// src/components/onboarding/AILoadingScreen.tsx

import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const phrases = [
  "Analyzing your vibe ✨",
  "Reading your cosmic energy 🌌",
  "Writing your perfect story 💫",
  "Aligning your stars ✨",
  "Almost there… manifesting your aura 🌠",
];

const AILoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      >
        <Loader2 className="w-10 h-10 text-cosmic animate-spin" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="space-y-2"
      >
        <h2 className="text-xl font-semibold text-cosmic flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-cosmic" />
          Crafting your AI Summary
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto animate-pulse">
          Sit tight while our AI curates your most authentic self…
        </p>
      </motion.div>

      <div className="text-sm text-muted-foreground space-y-1">
        {phrases.map((text, idx) => (
          <motion.p
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 2,
              delay: idx * 2,
              repeat: Infinity,
              repeatDelay: 5,
            }}
          >
            {text}
          </motion.p>
        ))}
      </div>
    </div>
  );
};

export default AILoadingScreen;