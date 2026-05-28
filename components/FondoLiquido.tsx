"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  colors?: string[];
  intensity?: number;
  arcoiris?: boolean;
};

const esMobile = () => {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPad|iPhone|iPod/.test(navigator.userAgent);
};

const PALETA_ARCOIRIS = [
  "#FFD60A",
  "#7B2CBF",
  "#39FF14",
  "#FF2D2D",
  "#00E0FF",
  "#FF6B35",
  "#06FFA5",
  "#D4145A",
  "#9D4EDD",
  "#FF1493",
];

export default function FondoLiquido({
  colors,
  intensity = 0.85,
  arcoiris = true,
}: Props) {
  const blobs = useRef<(SVGCircleElement | null)[]>(Array(10).fill(null));
  const perturbacionRef = useRef({ x: 0, y: 0 });
  const perturbacionActualRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const ultimaInteraccionRef = useRef(0);
  const [esMobileState, setEsMobileState] = useState(false);
  const [mostrarBotonGiro, setMostrarBotonGiro] = useState(false);
  const [giroActivo, setGiroActivo] = useState(false);

  useEffect(() => {
    const mobile = esMobile();
    setEsMobileState(mobile);

    const handleMove = (e: PointerEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mouse: perturbación SUTIL. Max ±0.08 (era 0.3).
      perturbacionRef.current = {
        x: (e.clientX / w - 0.5) * 0.08,
        y: (e.clientY / h - 0.5) * 0.08,
      };
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      perturbacionRef.current = {
        x: Math.max(-30, Math.min(30, gamma)) / 400,
        y: Math.max(-30, Math.min(30, (beta - 30))) / 400,
      };
    };

    if (mobile) {
      // @ts-expect-error - tipo no estándar
      const necesitaPermiso = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";

      if (necesitaPermiso) {
        // iOS 13+
        const ya = localStorage.getItem("fep_giro_permiso");
        if (ya === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
          setGiroActivo(true);
        } else {
          // Siempre mostrar el botón si no se concedió aún - persistente, no se descarta
          setMostrarBotonGiro(true);
        }
      } else {
        // Android, iOS antiguos
        window.addEventListener("deviceorientation", handleOrientation);
        setGiroActivo(true);
      }
    } else {
      window.addEventListener("pointermove", handleMove);
    }

    const tick = () => {
      tRef.current += 0.004;
      const ahora = performance.now();
      const sinInteractuar = ahora - ultimaInteraccionRef.current > 1500;

      if (sinInteractuar) {
        // Decay rápido de la perturbación cuando no hay input
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

      const cantidad = mobile ? 6 : 10;

      for (let i = 0; i < cantidad; i++) {
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
      window.removeEventListener("deviceorientation", handleOrientation);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function pedirPermisoGiro() {
    // @ts-expect-error - tipo no estándar
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        // @ts-expect-error - tipo no estándar
        const permiso = await DeviceOrientationEvent.requestPermission();
        if (permiso === "granted") {
          localStorage.setItem("fep_giro_permiso", "granted");
          window.addEventListener("deviceorientation", (e) => {
            ultimaInteraccionRef.current = performance.now();
            const gamma = e.gamma ?? 0;
            const beta = e.beta ?? 0;
            perturbacionRef.current = {
              x: Math.max(-30, Math.min(30, gamma)) / 400,
              y: Math.max(-30, Math.min(30, (beta - 30))) / 400,
            };
          });
          setGiroActivo(true);
          setMostrarBotonGiro(false);
        } else {
          localStorage.setItem("fep_giro_permiso", "denied");
          setMostrarBotonGiro(false);
        }
      } catch {
        setMostrarBotonGiro(false);
      }
    }
  }

  let paleta: string[];
  if (arcoiris || !colors || colors.length === 0) {
    paleta = PALETA_ARCOIRIS;
  } else {
    paleta = [];
    for (let i = 0; i < 10; i++) {
      paleta.push(colors[i % colors.length]);
    }
  }

  const radios = [20, 17, 19, 15, 18, 16, 18, 14, 17, 15];
  const cantidad = esMobileState ? 6 : 10;

  const stdDeviation = esMobileState ? 4 : 7;
  const alphaA = esMobileState ? 10 : 12;
  const alphaB = esMobileState ? -5 : -6;
  const softBlur = 2.5;

  return (
    <>
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
              <feGaussianBlur in="SourceGraphic" stdDeviation={stdDeviation} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${alphaA} ${alphaB}`}
                result="goo"
              />
              <feGaussianBlur in="goo" stdDeviation={softBlur} />
            </filter>
          </defs>

          <g filter="url(#goo)" style={{ opacity: intensity }}>
            {Array.from({ length: cantidad }).map((_, i) => (
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

      {/* Botón flotante de giroscopio para iOS (persistente hasta que el user lo active) */}
      {mostrarBotonGiro && !giroActivo && (
        <button
          onClick={pedirPermisoGiro}
          className="fixed top-4 right-4 z-50 bg-white/15 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 text-xs font-meta font-bold text-white pointer-events-auto"
          aria-label="Activar movimiento del fondo con giroscopio"
        >
          🌀 Mover con teléfono
        </button>
      )}
    </>
  );
}
