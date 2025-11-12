// import { useState, useRef, useEffect } from 'react';
// import { Heart, MapPin, Sparkles } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface Profile {
//   id: string;
//   name: string;
//   age: number;
//   bio: string;
//   imageUrl: string;
//   distance?: string;
//   compatibility?: number;
// }

// interface SwipeCardProps {
//   profile: Profile;
//   index: number;
//   total: number;
//   onLike: () => void;
//   onPass: () => void;
// }

// const SwipeCard = ({ profile, index, total, onLike, onPass }: SwipeCardProps) => {
//   const [position, setPosition] = useState({ x: 0, y: 0 });
//   const [isDragging, setIsDragging] = useState(false);
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [animationType, setAnimationType] = useState<'like' | 'pass' | null>(null);
//   const cardRef = useRef<HTMLDivElement>(null);
//   const startPos = useRef({ x: 0, y: 0 });

//   const isTopCard = index === total - 1;
//   const zIndex = total - index;
//   const scale = 1 - (total - index - 1) * 0.05;
//   const translateY = (total - index - 1) * 10;

//   useEffect(() => {
//     if (animationType) {
//       setIsAnimating(true);
//       const timer = setTimeout(() => {
//         if (animationType === 'like') {
//           onLike();
//         } else {
//           onPass();
//         }
//         setIsAnimating(false);
//         setAnimationType(null);
//       }, 500);
//       return () => clearTimeout(timer);
//     }
//   }, [animationType, onLike, onPass]);

//   const handleStart = (clientX: number, clientY: number) => {
//     if (!isTopCard || isAnimating) return;
//     setIsDragging(true);
//     startPos.current = { x: clientX - position.x, y: clientY - position.y };
//   };

//   const handleMove = (clientX: number, clientY: number) => {
//     if (!isDragging || !isTopCard || isAnimating) return;
//     const newX = clientX - startPos.current.x;
//     const newY = clientY - startPos.current.y;
//     setPosition({ x: newX, y: newY });
//   };

//   const handleEnd = () => {
//     if (!isDragging || !isTopCard || isAnimating) return;
//     setIsDragging(false);

//     const threshold = 100;
//     if (Math.abs(position.x) > threshold) {
//       if (position.x > 0) {
//         setAnimationType('like');
//         setPosition({ x: 1000, y: position.y });
//       } else {
//         setAnimationType('pass');
//         setPosition({ x: -1000, y: position.y });
//       }
//     } else {
//       setPosition({ x: 0, y: 0 });
//     }
//   };

//   const rotation = isTopCard ? position.x / 20 : 0;
//   const opacity = isTopCard ? 1 : 0.8 - (total - index - 1) * 0.2;

//   return (
//     <>
//       <div
//         ref={cardRef}
//         className={cn(
//           'absolute inset-0 glass-card rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none',
//           isAnimating && animationType === 'like' && 'animate-starburst',
//           isAnimating && animationType === 'pass' && 'animate-void'
//         )}
//         style={{
//           transform: isTopCard
//             ? `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`
//             : `translateY(${translateY}px) scale(${scale})`,
//           transition: isDragging ? 'none' : 'all 0.3s ease-out',
//           zIndex,
//           opacity,
//         }}
//         onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
//         onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
//         onMouseUp={handleEnd}
//         onMouseLeave={handleEnd}
//         onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
//         onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
//         onTouchEnd={handleEnd}
//       >
//         <div className="relative h-full">
//           <img
//             src={profile.imageUrl}
//             alt={profile.name}
//             className="w-full h-full object-cover"
//             draggable={false}
//           />
          
//           <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />

//           {isTopCard && position.x > 50 && (
//             <div className="absolute top-8 right-8 rotate-12 cosmic-glow">
//               <div className="border-4 border-primary text-primary px-6 py-3 rounded-2xl font-bold text-2xl animate-pulse">
//                 LIKE
//               </div>
//             </div>
//           )}

//           {isTopCard && position.x < -50 && (
//             <div className="absolute top-8 left-8 -rotate-12">
//               <div className="border-4 border-destructive text-destructive px-6 py-3 rounded-2xl font-bold text-2xl animate-pulse">
//                 PASS
//               </div>
//             </div>
//           )}

//           <div className="absolute bottom-0 left-0 right-0 p-6">
//             <div className="flex items-center justify-between mb-2">
//               <h2 className="text-3xl font-bold text-foreground">
//                 {profile.name}, {profile.age}
//               </h2>
//               {profile.compatibility && (
//                 <div className="flex items-center gap-1 glass-card px-3 py-1 rounded-full">
//                   <Heart className="w-4 h-4 fill-primary text-primary" />
//                   <span className="text-primary font-bold">{profile.compatibility}%</span>
//                 </div>
//               )}
//             </div>

//             {profile.distance && (
//               <div className="flex items-center gap-2 text-muted-foreground mb-3">
//                 <MapPin className="w-4 h-4" />
//                 <span>{profile.distance} away</span>
//               </div>
//             )}

//             <p className="text-foreground/90 leading-relaxed">{profile.bio}</p>

//             <div className="flex gap-2 mt-4">
//               <span className="glass-card px-3 py-1 rounded-full text-sm flex items-center gap-1">
//                 <Sparkles className="w-3 h-3 text-primary" />
//                 Verified
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {isAnimating && animationType === 'like' && (
//         <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
//           <div className="animate-starburst-particles">
//             {[...Array(12)].map((_, i) => (
//               <div
//                 key={i}
//                 className="absolute w-3 h-3 bg-primary rounded-full"
//                 style={{
//                   transform: `rotate(${i * 30}deg) translateY(-100px)`,
//                   animation: `particle-burst 0.6s ease-out forwards`,
//                   animationDelay: `${i * 0.03}s`,
//                 }}
//               />
//             ))}
//           </div>
//         </div>
//       )}

//       {isAnimating && animationType === 'pass' && (
//         <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
//           <div className="animate-void-collapse">
//             <div className="w-32 h-32 rounded-full border-4 border-muted/50 animate-ping" />
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default SwipeCard;



// src/components/SwipeCard.tsx

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Heart, MapPin, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/types/types";

// interface Profile {
//   id: string;
//   name: string;
//   age: number;
//   bio: string;
//   imageUrl: string;
//   distance?: string;
//   compatibility?: number;
// }

interface SwipeCardProps {
  profile: Profile;
  index: number;
  total: number;
  onLike: () => void;
  onPass: () => void;
  onSuperLike?: () => void;
}

const SwipeCard = (
  { profile, index, total, onLike, onPass, onSuperLike }: SwipeCardProps,
  ref: any
) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<"like" | "pass" | "superlike" | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const isTopCard = index === total - 1;
  const stackIndex = total - index - 1;
  const zIndex = 100 - stackIndex;
  const scale = 1 - stackIndex * 0.07;
  const translateY = stackIndex * 25;
  const opacity = isTopCard ? 1 : 0.7 - stackIndex * 0.15;

  useEffect(() => {
    if (!animationType) return;
    setIsAnimating(true);
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;

      if (animationType === "like") onLike?.();
      else if (animationType === "pass") onPass?.();
      else if (animationType === "superlike") onSuperLike?.();

      setIsAnimating(false);
      setAnimationType(null);
      setPosition({ x: 0, y: 0 });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [animationType, onLike, onPass, onSuperLike]);

  useImperativeHandle(ref, () => ({
    triggerAnimation: (type: "like" | "pass" | "superlike") => {
      if (!isTopCard || isAnimating) return;
      setAnimationType(type);

      if (type === "like") setPosition({ x: 800, y: 0 });
      else if (type === "pass") setPosition({ x: -800, y: 0 });
      else if (type === "superlike") setPosition({ x: 0, y: -800 });
    },
  }));

  const handleStart = (x: number, y: number) => {
    if (!isTopCard || isAnimating) return;
    setIsDragging(true);
    startPos.current = { x: x - position.x, y: y - position.y };
  };

  const handleMove = (x: number, y: number) => {
    if (!isDragging || !isTopCard || isAnimating) return;
    const newX = x - startPos.current.x;
    const newY = y - startPos.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    if (!isDragging || !isTopCard || isAnimating) return;
    setIsDragging(false);
    const threshold = 100;
    if (Math.abs(position.x) > threshold) {
      setAnimationType(position.x > 0 ? "like" : "pass");
      setPosition({ x: position.x > 0 ? 800 : -800, y: position.y });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const rotation = isTopCard ? position.x / 20 : 0;
  const likeOpacity = Math.min(Math.max(position.x / 100, 0), 1);
  const passOpacity = Math.min(Math.max(-position.x / 100, 0), 1);

  // Apply animation transforms
  const transform =
    animationType === "like"
      ? "translateX(120%) rotate(15deg)"
      : animationType === "pass"
      ? "translateX(-120%) rotate(-15deg)"
      : animationType === "superlike"
      ? "translateY(-120%) scale(1.1)"
      : `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`;

  const superLikeGlow =
    animationType === "superlike"
      ? "shadow-[0_0_40px_10px_rgba(56,189,248,0.8)]"
      : "";

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-xl",
        "transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
        isAnimating && "pointer-events-none",
        superLikeGlow
      )}
      style={{
        transform,
        zIndex,
        opacity,
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      <img
        src={profile.imageUrl}
        alt={profile.name}
        className="w-full h-full object-cover object-center"
        draggable={false}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* LIKE / PASS Overlays */}
      <div
        className="absolute top-8 right-8 rotate-12 text-4xl font-bold text-primary"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </div>
      <div
        className="absolute top-8 left-8 -rotate-12 text-4xl font-bold text-destructive"
        style={{ opacity: passOpacity }}
      >
        PASS
      </div>

      {/* SUPERLIKE Overlay */}
      {animationType === "superlike" && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-sky-400 text-5xl font-extrabold drop-shadow-lg animate-pulse">
          SUPER LIKE ⭐
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-white drop-shadow-md">
            {profile.name}, {profile.age}
          </h2>
          {profile.compatibility && (
            <div className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full text-white text-sm">
              <Heart className="w-4 h-4 fill-primary text-primary" />
              {profile.compatibility}%
            </div>
          )}
        </div>

        {profile.distance && (
          <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{profile.distance} away</span>
          </div>
        )}

        <p className="text-gray-200 text-sm leading-relaxed line-clamp-3">{profile.bio}</p>

        <div className="flex gap-2 mt-4">
          <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs flex items-center gap-1 text-white">
            <Sparkles className="w-3 h-3 text-primary" />
            Verified
          </span>
        </div>
      </div>
    </div>
  );
};

export default forwardRef<
  { triggerAnimation: (type: "like" | "pass" | "superlike") => void },
  SwipeCardProps
>(SwipeCard);




// export default SwipeCard;