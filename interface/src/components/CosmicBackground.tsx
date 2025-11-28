import { useEffect, useRef } from "react";

const CosmicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // --- ONLY 3 SOFT ORBS ---
    const orbs = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 150 + 120,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      color:
        Math.random() > 0.5
          ? "rgba(0, 200, 255, 0.18)"
          : "rgba(90, 50, 255, 0.14)",
    }));

    let t = 0;

    const drawBase = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#020414");
      gradient.addColorStop(1, "#04010A");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const drawFog = () => {
      ctx.save();
      ctx.globalAlpha = 0.45;

      // Slow drifting fog bump
      const fog = ctx.createRadialGradient(
        width * 0.5,
        height * 0.7 + Math.sin(t * 0.0003) * 25,
        0,
        width * 0.5,
        height * 0.7,
        width * 0.9
      );

      fog.addColorStop(0, "rgba(140, 80, 255, 0.15)");
      fog.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    };

    const drawOrbs = () => {
      orbs.forEach((o) => {
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, o.color);
        g.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();

        // ultra-slow drift
        o.x += o.dx;
        o.y += o.dy;

        if (o.x - o.r > width) o.x = -o.r;
        if (o.x + o.r < 0) o.x = width + o.r;
        if (o.y - o.r > height) o.y = -o.r;
        if (o.y + o.r < 0) o.y = height + o.r;
      });
    };

    const animate = () => {
      drawBase();
      drawFog();
      drawOrbs();
      t++;
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -10 }}
    />
  );
};

export default CosmicBackground;
