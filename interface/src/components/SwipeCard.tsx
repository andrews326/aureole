// src/components/SwipeCard.tsx


import {
  forwardRef,
  useRef,
  useImperativeHandle,
  memo,
  useState,
} from "react";

interface Props {
  profile: any;
  index: number;
  total: number;
  onLike: () => void;
  onPass: () => void;
  onSuperLike?: () => void;
}

const SwipeCard = memo(
  forwardRef(({ profile, index, total, onLike, onPass, onSuperLike }: Props, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const start = useRef({ x: 0, y: 0 });
    const pos = useRef({ x: 0, y: 0 });
    const animating = useRef(false);

    const [photoIndex, setPhotoIndex] = useState(0);

    const nextPhoto = () => {
      if (profile.photos.length > 1) {
        setPhotoIndex((i) => (i + 1) % profile.photos.length);
      }
    };

    const prevPhoto = () => {
      if (profile.photos.length > 1) {
        setPhotoIndex((i) => (i === 0 ? profile.photos.length - 1 : i - 1));
      }
    };

    // ------------------------
    // Drag handlers
    // ------------------------
    const applyTransform = () => {
      const el = cardRef.current;
      if (!el) return;

      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) rotate(${pos.current.x / 20}deg)`;
    };

    const onPointerDown = (x: number, y: number) => {
      if (animating.current) return;
      dragging.current = true;
      start.current = { x, y };
    };

    const onPointerMove = (x: number, y: number) => {
      if (!dragging.current || animating.current) return;
      pos.current = { x: x - start.current.x, y: y - start.current.y };
      requestAnimationFrame(applyTransform);
    };

    const onPointerUp = () => {
      if (!dragging.current || animating.current) return;
      dragging.current = false;

      const threshold = 120;

      if (pos.current.x > threshold) {
        swipeOut("right");
      } else if (pos.current.x < -threshold) {
        swipeOut("left");
      } else if (pos.current.y < -threshold) {
        swipeOut("up");
      } else {
        resetPosition();
      }
    };

    const swipeOut = (dir: "left" | "right" | "up") => {
      animating.current = true;
      const el = cardRef.current;
      if (!el) return;

      let tx = 0,
        ty = 0;
      if (dir === "right") tx = 600;
      if (dir === "left") tx = -600;
      if (dir === "up") ty = -600;

      el.style.transition = "transform 0.45s ease-out";
      el.style.transform = `translate(${tx}px, ${ty}px) rotate(${tx / 20}deg)`;

      setTimeout(() => {
        if (dir === "right") onLike();
        if (dir === "left") onPass();
        if (dir === "up") onSuperLike?.();

        animating.current = false;
      }, 450);
    };

    const resetPosition = () => {
      const el = cardRef.current;
      if (!el) return;

      el.style.transition = "transform 0.3s ease-out";
      el.style.transform = "translate(0px, 0px) rotate(0deg)";
      pos.current = { x: 0, y: 0 };

      setTimeout(() => {
        el.style.transition = "";
      }, 300);
    };

    // imperative external triggers
    useImperativeHandle(ref, () => ({
      triggerAnimation: (type: "like" | "pass" | "superlike") => {
        if (animating.current) return;
        if (type === "like") swipeOut("right");
        if (type === "pass") swipeOut("left");
        if (type === "superlike") swipeOut("up");
      },
    }));

    // ------------------------
    // STACK POSITIONING FIX
    // ------------------------
    const depth = index;

    return (
      <div
        ref={cardRef}
        className="absolute inset-0 rounded-2xl overflow-hidden bg-black"
        style={{
          zIndex: 100 - index,
          transform: `scale(${1 - depth * 0.04}) translateY(${depth * 14}px)`,
          touchAction: "none",
        }}
        onMouseDown={(e) => onPointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => onPointerMove(e.clientX, e.clientY)}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={(e) => onPointerDown(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onPointerMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onPointerUp}
      >

        {/* PHOTO INDICATORS */}
<div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-20">
  {profile.photos.map((_, i) => (
    <div
      key={i}
      className={`h-1.5 w-1.5 rounded-full transition-all ${
        i === photoIndex ? "bg-white" : "bg-white/40"
      }`}
    />
  ))}
</div>

        {/* IMAGE */}
        <div className="w-full h-full relative">
            <img
             key={photoIndex}
             src={profile.photos[photoIndex] || "/fallback.jpg"}
             loading="lazy"
             alt="profile"
             className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
             onLoad={(e) => (e.currentTarget.style.opacity = "1")}
            />
        </div>


        {/* SLIDER TAP ZONES */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={(e) => (e.stopPropagation(), prevPhoto())} />
          <div className="flex-1" onClick={(e) => (e.stopPropagation(), nextPhoto())} />
        </div>

        {/* TEXT */}
        <div className="absolute bottom-0 p-4 w-full text-white bg-gradient-to-t from-black/80 to-transparent">
          <div className="text-xl font-bold">
            {profile.name}, {profile.age}
          </div>
        </div>
      </div>
    );
  })
);

export default SwipeCard;