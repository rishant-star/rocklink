import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
}

// Previously two neon hues (primary/secondary); the new palette is
// deliberately near-monochrome, so this is now a single warm off-white
// tone at low opacity — an ambient texture, not a light show.
const PARTICLE_COLOR = "236,233,226";

/**
 * Ambient background particles, mounted once at the app shell level (never
 * re-instantiated per page). Density/speed can be nudged via the
 * `intensity` prop to subtly react to match phase (see Design-System.md
 * Section 4) without re-mounting the canvas.
 */
export function ParticleField({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Deferred Improvements (RELEASE_SIGNOFF.md): a drag-resize fires
    // many `resize` events per second; resizing the canvas on every one
    // caused measurable jank. rAF-coalescing collapses any burst within
    // a single frame down to one resize, which is enough to track the
    // window smoothly without doing the work more than once per paint.
    let resizeFrame: number | null = null;
    const handleResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resize();
      });
    };
    window.addEventListener("resize", handleResize);

    const count = 36;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.2 + 0.4,
      speed: Math.random() * 0.15 + 0.05,
      opacity: Math.random() * 0.18 + 0.04,
    }));

    if (prefersReducedMotion) {
      // Draw a single static frame and stop — no continuous animation loop.
      draw();
      return () => {
        window.removeEventListener("resize", handleResize);
        if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      };
    }

    let frame: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${PARTICLE_COLOR},${p.opacity})`;
        ctx.fill();
      }
    }

    function tick() {
      for (const p of particlesRef.current) {
        p.y -= p.speed * intensity;
        if (p.y < -10 && canvas) p.y = canvas.height + 10;
      }
      draw();
      frame = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
