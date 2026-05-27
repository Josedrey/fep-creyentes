"use client";

import { useEffect, useRef } from "react";

type Props = {
  colors?: string[]; // colores del gradiente líquido
  intensity?: number; // 0 a 1
};

export default function FondoLiquido({
  colors = ["#7B2CBF", "#D4145A", "#00E0FF"],
  intensity = 0.5,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetRef.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("touchmove", (e) => {
      if (e.touches[0]) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        targetRef.current = {
          x: e.touches[0].clientX / w,
          y: e.touches[0].clientY / h,
        };
      }
    });

    const tick = () => {
      tRef.current += 0.005;
      // Inercia (lerp)
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.06;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.06;

      const { x, y } = currentRef.current;
      const t = tRef.current;

      // 3 blobs con desfase: uno sigue al cursor directo, otros dos con offset orbital
      if (blob1Ref.current) {
        const px = x * 100;
        const py = y * 100;
        blob1Ref.current.style.transform = `translate(${px - 50}vw, ${py - 50}vh)`;
      }
      if (blob2Ref.current) {
        const px = (x + Math.cos(t) * 0.2) * 100;
        const py = (y + Math.sin(t * 0.8) * 0.2) * 100;
        blob2Ref.current.style.transform = `translate(${px - 50}vw, ${py - 50}vh)`;
      }
      if (blob3Ref.current) {
        const px = (1 - x + Math.sin(t * 0.6) * 0.15) * 100;
        const py = (1 - y + Math.cos(t * 0.9) * 0.15) * 100;
        blob3Ref.current.style.transform = `translate(${px - 50}vw, ${py - 50}vh)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const c1 = colors[0] || "#7B2CBF";
  const c2 = colors[1] || colors[0] || "#D4145A";
  const c3 = colors[2] || colors[0] || "#00E0FF";

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "#0a0612" }}
    >
      <div
        ref={blob1Ref}
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{
          width: "120vmax",
          height: "120vmax",
          background: `radial-gradient(circle at center, ${c1} 0%, transparent 60%)`,
          opacity: intensity * 0.7,
          filter: "blur(40px)",
          mixBlendMode: "screen",
          willChange: "transform",
        }}
      />
      <div
        ref={blob2Ref}
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{
          width: "90vmax",
          height: "90vmax",
          background: `radial-gradient(circle at center, ${c2} 0%, transparent 65%)`,
          opacity: intensity * 0.65,
          filter: "blur(50px)",
          mixBlendMode: "screen",
          willChange: "transform",
        }}
      />
      <div
        ref={blob3Ref}
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{
          width: "100vmax",
          height: "100vmax",
          background: `radial-gradient(circle at center, ${c3} 0%, transparent 70%)`,
          opacity: intensity * 0.55,
          filter: "blur(60px)",
          mixBlendMode: "screen",
          willChange: "transform",
        }}
      />
      {/* Grano sutil encima para que no se vea "CSS limpio" */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.08,
          mixBlendMode: "overlay",
        }}
      />
      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
