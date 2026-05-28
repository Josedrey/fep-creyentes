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

// Paleta arcoíris INTERCALADA: fuertes y suaves se alternan para que el goo no "se coma" colores
// Antes ordenados por hue, ahora intercalados a propósito
const PALETA_ARCOIRIS = [
  "#FFD60A", // amarillo
  "#7B2CBF", // violeta
  "#39FF14", // verde lima
  "#FF2D2D", // rojo
  "#00E0FF", // cian
  "#FF6B35", // naranja
  "#06FFA5", // mint
  "#D4145A", // magenta
  "#9D4EDD", // lavanda
  "#FF1493", // rosa
];

export default function FondoLiquido({
  colors,
  intensity = 0.85,
  arcoiris = true,
}: Props) {
  const blobs = useRef<(SVGCircleElement | null)[]>(Array(10).fill(null));
  // Perturbación por mouse/giroscopio (offset suave, no posición absoluta)
  const perturbacionRef = useRef({ x: 0, y: 0 });
  const perturbacionActualRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const ultimaInteraccionRef = useRef(0);
  const [esMobileState, setEsMobileState] = useState(false);
  const [mostrarPermisoIOS, setMostrarPermisoIOS] = useState(false);

  useEffect(() => {
    const mobile = esMobile();
    setEsMobileState(mobile);

    const handleMove = (e: PointerEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mouse aporta perturbación, NO posición absoluta. Max ±0.15 desde el centro.
      perturbacionRef.current = {
        x: (e.clientX / w - 0.5) * 0.3,
        y: (e.clientY / h - 0.5) * 0.3,
      };
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      perturbacionRef.current = {
        x: Math.max(-30, Math.min(30, gamma)) / 200,
        y: Math.max(-30, Math.min(30, (beta - 30))) / 200,
      };
    };

    if (mobile) {
      // @ts-expect-error - tipo no estándar
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const yaPedi = localStorage.getItem("fep_giro_permiso");
        if (yaPedi === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else if (yaPedi !== "denied") {
          setMostrarPermisoIOS(true);
        }
      } else {
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } else {
      window.addEventListener("pointermove", handleMove);
    }

    const tick = () => {
      tRef.current += 0.004;
      const ahora = performance.now();
      const sinInteractuar = ahora - ultimaInteraccionRef.current > 2000;

      // Si no hay input desde hace 2s, decae la perturbación a 0 suavemente
      if (sinInteractuar) {
        perturbacionRef.current.x *= 0.98;
        perturbacionRef.current.y *= 0.98;
      }

      // Interpolación suave de la perturbación
      perturbacionActualRef.current.x += (perturbacionRef.current.x - perturbacionActualRef.current.x) * 0.04;
      perturbacionActualRef.current.y += (perturbacionRef.current.y - perturbacionActualRef.current.y) * 0.04;

      const pX = perturbacionActualRef.current.x;
      const pY = perturbacionActualRef.current.y;
      const t = tRef.current;

      // Cada blob tiene su propia órbita amplia y su propio offset base
      // El "centro" base de cada blob ya es disperso (no todos parten del mismo punto)
      // El mouse solo agrega un pequeño shift global
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

      // En mobile usar solo los primeros 6 blobs para perf
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
              x: Math.max(-30, Math.min(30, gamma)) / 200,
              y: Math.max(-30, Math.min(30, (beta - 30))) / 200,
            };
          });
        } else {
          localStorage.setItem("fep_giro_permiso", "denied");
        }
      } catch {
        localStorage.setItem("fep_giro_permiso", "denied");
      }
    }
    setMostrarPermisoIOS(false);
  }

  function rechazarPermiso() {
    localStorage.setItem("fep_giro_permiso", "denied");
    setMostrarPermisoIOS(false);
  }

  // Decidir paleta
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

  // Blur ajustado por dispositivo para perf
  const stdDeviation = esMobileState ? 4 : 7;
  const colorMatrixAlpha = esMobileState ? "10 -5" : "12 -6";
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
                values={`1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 ${colorMatrixAlpha.split(" ")[0]} ${colorMatrixAlpha.split(" ")[1]}`}
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

      {mostrarPermisoIOS && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-3 max-w-md mx-auto">
          <p className="font-meta text-sm text-white/90 leading-snug">
            ¿Activar movimiento del fondo con tu teléfono? Inclínalo para mover los colores.
          </p>
          <div className="flex gap-2">
            <button
              onClick={pedirPermisoGiro}
              className="flex-1 bg-white text-black font-body font-bold py-2 rounded-full text-sm"
            >
              Activar
            </button>
            <button
              onClick={rechazarPermiso}
              className="flex-1 border border-white/30 text-white font-body py-2 rounded-full text-sm"
            >
              No
            </button>
          </div>
        </div>
      )}
    </>
  );
}
