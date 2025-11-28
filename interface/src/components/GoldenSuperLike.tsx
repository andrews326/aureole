// // src/components/GoldenSuperLike.tsx


// // src/components/GoldenSuperLike.tsx
// import React from "react";
// import { motion } from "framer-motion";

// interface GoldenSuperLikeProps {
//   onComplete?: () => void;
//   className?: string;
// }

// const particles = Array.from({ length: 16 });

// export default function GoldenSuperLike({ onComplete, className = "" }: GoldenSuperLikeProps) {
//   return (
//     <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}>
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         className="absolute inset-0"
//       />
//       {particles.map((_, i) => {
//         const angle = (i / particles.length) * Math.PI * 2;
//         const dist = 60 + Math.random() * 80;
//         const tx = Math.cos(angle) * dist;
//         const ty = Math.sin(angle) * dist;
//         const size = 6 + Math.random() * 8;
//         const delay = Math.random() * 0.12;

//         return (
//           <motion.span
//             key={i}
//             initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
//             animate={{ x: tx, y: ty, scale: 1, opacity: 0 }}
//             transition={{
//               duration: 0.9,
//               delay,
//               ease: "easeOut",
//             }}
//             style={{
//               position: "absolute",
//               left: "50%",
//               top: "50%",
//               width: size,
//               height: size,
//               borderRadius: 9999,
//               background: `radial-gradient(circle at 30% 30%, #fff6c8, #ffde6b)`,
//               boxShadow: `0 4px 18px rgba(255,205,80,0.45)`,
//             }}
//             onAnimationComplete={() => {
//               if (i === particles.length - 1 && onComplete) onComplete();
//             }}
//           />
//         );
//       })}

//       {/* central shimmer */}
//       <motion.div
//         initial={{ scale: 0.6, opacity: 0 }}
//         animate={{ scale: 1.15, opacity: 1 }}
//         transition={{ duration: 0.35, ease: "easeOut" }}
//         style={{
//           width: 220,
//           height: 220,
//           borderRadius: 9999,
//           background:
//             "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(255,223,110,0.06) 35%, transparent 55%)",
//           mixBlendMode: "screen",
//         }}
//       />
//     </div>
//   );
// }