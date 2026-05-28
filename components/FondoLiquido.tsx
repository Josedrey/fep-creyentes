"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  colors?: string[];
  intensity?: number;
};

const esMobile = () => {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPad|iPhone|iPod/.test(navigator.userAgent);
};

export default function FondoLiquido({
  colors = ["#7B2CBF", "#D4145A", "#00E0FF"],
  intensity = 0.85,
}: Props) {
  const blobs = useRef<(SVGCircleElement | null)[]>([null, null, null, null, null, null]);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const ultimaInteraccionRef = useRef(0);
  const [mostrarPermisoIOS, setMostrarPermisoIOS] = useState(false);

  useEffect(() => {
    const mobile = esMobile();

    const handleMove = (e: PointerEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetRef.current = { x: e.clientX / w, y: e.clientY / h };
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      ultimaInteraccionRef.current = performance.now();
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      const x = 0.5 + Math.max(-30, Math.min(30, gamma)) / 80;
      const y = 0.5 + Math.max(-30, Math.min(30, (beta - 30))) / 80;
      targetRef.current = { x, y };
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

      if (sinInteractuar) {
        targetRef.current = {
          x: 0.5 + Math.cos(tRef.current * 0.4) * 0.2,
          y: 0.5 + Math.sin(tRef.current * 0.3) * 0.2,
        };
      }

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      const { x, y } = currentRef.current;
      const t = tRef.current;

      // 6 blobs orbitando alrededor del target con desfases
      // Coordenadas en SVG viewBox 100x100
      const orbits = [
        { dx: 0,    dy: 0,    r: 22, sp: 0.8,  ph: 0,    rad: 0.18 },
        { dx: 28,   dy: -22,  r: 18, sp: 0.7,  ph: 1.2,  rad: 0.15 },
        { dx: -28,  dy: 22,   r: 20, sp: 0.55, ph: 2.4,  rad: 0.16 },
        { dx: 22,   dy: 28,   r: 16, sp: 0.85, ph: 3.6,  rad: 0.14 },
        { dx: -22,  dy: -28,  r: 19, sp: 0.65, ph: 4.8,  rad: 0.17 },
        { dx: 0,    dy: 32,   r: 17, sp: 0.75, ph: 6.0,  rad: 0.15 },
      ];

      orbits.forEach((o, i) => {
        const blob = blobs.current[i];
        if (!blob) return;
        const cx = x * 100 + o.dx + Math.cos(t * o.sp + o.ph) * (o.rad * 100);
        const cy = y * 100 + o.dy + Math.sin(t * o.sp * 0.9 + o.ph) * (o.rad * 100);
        blob.setAttribute("cx", `${cx}`);
        blob.setAttribute("cy", `${cy}`);
      });

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
            const x = 0.5 + Math.max(-30, Math.min(30, gamma)) / 80;
            const y = 0.5 + Math.max(-30, Math.min(30, (beta - 30))) / 80;
            targetRef.current = { x, y };
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

  const palette = [
    colors[0],
    colors[1] || colors[0],
    colors[2] || colors[0],
    colors[0],
    colors[1] || colors[0],
    colors[2] || colors[0],
  ];

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
            {/* Filter goo: blur grande + alpha steep = los blobs se fusionan al juntarse */}
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 22 -10"
                result="goo"
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
            {/* Suavizado final */}
            <filter id="softBlur">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          <g filter="url(#goo)" style={{ opacity: intensity }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle
                key={i}
                ref={(el) => { blobs.current[i] = el; }}
                cx="50"
                cy="50"
                r={[22, 18, 20, 16, 19, 17][i]}
                fill={palette[i]}
              />
            ))}
          </g>
        </svg>

        {/* Grano sutil */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.08,
            mixBlendMode: "overlay",
          }}
        />
        {/* Overlay para legibilidad sobre los colores saturados */}
        <div className="absolute inset-0 bg-black/35" />
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
