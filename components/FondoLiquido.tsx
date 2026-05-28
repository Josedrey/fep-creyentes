"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  colors?: string[];
  intensity?: number;
  arcoiris?: boolean;
};

const detectarMobile = () => {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPad|iPhone|iPod/.test(navigator.userAgent) || window.innerWidth < 768;
};

const PALETA_ARCOIRIS = [
  "#FFD60A", "#7B2CBF", "#39FF14", "#FF2D2D", "#00E0FF",
  "#FF6B35", "#06FFA5", "#D4145A", "#9D4EDD", "#FF1493",
];

export default function FondoLiquido({
  colors,
  intensity = 0.85,
  arcoiris = true,
}: Props) {
  const [esMobile, setEsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setEsMobile(detectarMobile());
  }, []);

  let paleta: string[];
  if (arcoiris || !colors || colors.length === 0) {
    paleta = PALETA_ARCOIRIS;
  } else {
    paleta = [];
    for (let i = 0; i < 10; i++) paleta.push(colors[i % colors.length]);
  }

  if (esMobile === null) {
    return <div aria-hidden className="fixed inset-0 -z-10" style={{ background: "#0a0612" }} />;
  }

  if (esMobile) {
    return <FondoMobile paleta={paleta} intensity={intensity} />;
  }

  return <FondoDesktop paleta={paleta} intensity={intensity} />;
}

// ---------- Mobile: gradiente cónico rotando sobre sí mismo (sin bordes visibles) ----------
function FondoMobile({ paleta, intensity }: { paleta: string[]; intensity: number }) {
  const ruedaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const angRef = useRef(0);

  // Construir el conic-gradient con la paleta (cerrar el círculo repitiendo el primero)
  const c = paleta;
  const stops = [...c, c[0]]
    .map((color, i, arr) => `${color} ${(i * 360) / (arr.length - 1)}deg`)
    .join(", ");
  const conic = `conic-gradient(from 0deg at 50% 50%, ${stops})`;

  useEffect(() => {
    const tick = () => {
      angRef.current += 0.12; // grados por frame -> giro lento
      if (ruedaRef.current) {
        // Escala 2.2 para que el círculo cónico cubra toda la pantalla incluso en esquinas
        ruedaRef.current.style.transform = `translate(-50%, -50%) rotate(${angRef.current}deg) scale(2.2)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "#0a0612" }}
    >
      {/* Rueda cónica gigante centrada, rota sobre su centro -> nunca muestra bordes */}
      <div
        ref={ruedaRef}
        className="absolute top-1/2 left-1/2"
        style={{
          width: "100vmax",
          height: "100vmax",
          background: conic,
          opacity: intensity,
          filter: "blur(60px)",
          willChange: "transform",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}

// ---------- Desktop: goo filter ----------
function FondoDesktop({ paleta, intensity }: { paleta: string[]; intensity: number }) {
  const blobs = useRef<(SVGCircleElement | null)[]>(Array(10).fill(null));
  const perturbacionRef = useRef({ x: 0, y: 0 });
  const perturbacionActualRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const ultimaInteraccionRef = useRef(0);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;
      perturbacionRef.current = {
        x: (e.clientX / w - 0.5) * 0.08,
        y: (e.clientY / h - 0.5) * 0.08,
      };
    };
    window.addEventListener("pointermove", handleMove);

    const tick = () => {
      tRef.current += 0.004;
      const ahora = performance.now();
      if (ahora - ultimaInteraccionRef.current > 1500) {
        perturbacionRef.current.x *= 0.96;
        perturbacionRef.current.y *= 0.96;
      }
      perturbacionActualRef.current.x += (perturbacionRef.current.x - perturbacionActualRef.current.x) * 0.04;
      perturbacionActualRef.current.y += (perturbacionRef.current.y - perturbacionActualRef.current.y) * 0.04;

      const pX = perturbacionActualRef.current.x;
      const pY = perturbacionActualRef.current.y;
      const t = tRef.current;

      const orbits = [
        { baseX: 50, baseY: 50, sp: 0.6,  ph: 0.0, rad: 18 },
        { baseX: 78, baseY: 28, sp: 0.5,  ph: 0.7, rad: 16 },
        { baseX: 22, baseY: 72, sp: 0.55, ph: 1.4, rad: 18 },
        { baseX: 80, baseY: 70, sp: 0.65, ph: 2.1, rad: 14 },
        { baseX: 20, baseY: 30, sp: 0.7,  ph: 2.8, rad: 16 },
        { baseX: 50, baseY: 18, sp: 0.55, ph: 3.5, rad: 17 },
        { baseX: 50, baseY: 85, sp: 0.6,  ph: 4.2, rad: 15 },
        { baseX: 88, baseY: 50, sp: 0.5,  ph: 4.9, rad: 18 },
        { baseX: 12, baseY: 50, sp: 0.65, ph: 5.6, rad: 16 },
        { baseX: 50, baseY: 50, sp: 0.75, ph: 6.3, rad: 13 },
      ];

      for (let i = 0; i < 10; i++) {
        const o = orbits[i];
        const blob = blobs.current[i];
        if (!blob) continue;
        const cx = o.baseX + Math.cos(t * o.sp + o.ph) * o.rad + pX * 100;
        const cy = o.baseY + Math.sin(t * o.sp * 0.9 + o.ph) * o.rad + pY * 100;
        blob.setAttribute("cx", `${cx}`);
        blob.setAttribute("cy", `${cy}`);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const radios = [20, 17, 19, 15, 18, 16, 18, 14, 17, 15];

  return (
    <div
      aria-hidden
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ background: "#0a0612", zIndex: -1 }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="goo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 12 -6"
              result="goo"
            />
            <feGaussianBlur in="goo" stdDeviation="2.5" />
          </filter>
        </defs>
        <g filter="url(#goo)" style={{ opacity: intensity }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <circle
              key={i}
              ref={(el) => { blobs.current[i] = el; }}
              cx="50"
              cy="50"
              r={radios[i]}
              fill={paleta[i]}
            />
          ))}
        </g>
      </svg>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.08,
          mixBlendMode: "overlay",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
