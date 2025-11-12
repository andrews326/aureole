// src/components/onboarding/AnimatedAISummary.tsx


import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

interface AnimatedAISummaryProps {
  aiData: any;
}

const AnimatedAISummary = ({ aiData }: AnimatedAISummaryProps) => {
  const summaryText = aiData?.summary || "AI is still aligning your stars...";
  const interests = aiData?.preferences?.interests || [];

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-center gap-2"
      >
        <Sparkles className="w-6 h-6 text-cosmic" />
        <h2 className="text-2xl font-semibold text-cosmic">Your AI Summary</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.2 }}
        className="relative"
      >
        <TypewriterText text={summaryText} />
      </motion.div>

      {interests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-left max-w-md mx-auto"
        >
          <h3 className="font-medium mb-2 text-cosmic flex items-center gap-2">
            <Star className="w-4 h-4 text-cosmic" /> Your Interests
          </h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {interests.map((i: string, idx: number) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 + idx * 0.1 }}
              >
                {i}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};

const TypewriterText = ({ text }: { text: string }) => {
  return (
    <motion.p
      className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed whitespace-pre-line relative"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
      }}
      transition={{ duration: 0.5 }}
    >
      {text.split("").map((char, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: idx * 0.02 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="ml-1 inline-block w-2 h-5 bg-cosmic align-bottom animate-pulse"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    </motion.p>
  );
};

export default AnimatedAISummary;