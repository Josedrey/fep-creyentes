"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  colors?: string[];
  intensity?: number;
};

// Detección de iOS
const esIOS = () => {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const esMobile = () => {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPad|iPhone|iPod/.test(navigator.userAgent);
};

export default function FondoLiquido({
  colors = ["#7B2CBF", "#D4145A", "#00E0FF"],
  intensity = 0.65,
}: Props) {
  const blobs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const usandoGiroRef = useRef(false);
  const [mostrarPermisoIOS, setMostrarPermisoIOS] = useState(false);

  useEffect(() => {
    const mobile = esMobile();

    // Mouse en desktop
    const handleMove = (e: PointerEvent) => {
      if (usandoGiroRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetRef.current = { x: e.clientX / w, y: e.clientY / h };
    };

    // Giroscopio
    const handleOrientation = (e: DeviceOrientationEvent) => {
      usandoGiroRef.current = true;
      // beta: -180 a 180 (forward/back tilt)
      // gamma: -90 a 90 (left/right tilt)
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      // Mapear a 0-1, recortando ángulos extremos
      const x = 0.5 + Math.max(-30, Math.min(30, gamma)) / 60;
      const y = 0.5 + Math.max(-30, Math.min(30, (beta - 30))) / 60;
      targetRef.current = { x, y };
    };

    if (mobile) {
      // iOS 13+: hay que pedir permiso explícito en un user gesture
      // @ts-expect-error - tipo no estándar
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const yaPedi = localStorage.getItem("fep_giro_permiso");
        if (yaPedi === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else if (yaPedi !== "denied") {
          setMostrarPermisoIOS(true);
        }
      } else {
        // Android, iOS < 13: no requiere permiso
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } else {
      window.addEventListener("pointermove", handleMove);
    }

    // Loop de animación
    const tick = () => {
      tRef.current += 0.004;

      // Si no hay input activo (target en 0.5,0.5), mover el target con orbital
      if (!usandoGiroRef.current && Math.abs(targetRef.current.x - 0.5) < 0.01 && Math.abs(targetRef.current.y - 0.5) < 0.01) {
        // Sin interacción: target orbita solo
        targetRef.current = {
          x: 0.5 + Math.cos(tRef.current * 0.4) * 0.3,
          y: 0.5 + Math.sin(tRef.current * 0.3) * 0.3,
        };
      }

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      const { x, y } = currentRef.current;
      const t = tRef.current;

      // 5 blobs con offsets distintos para que ocupen toda la pantalla
      const offsets = [
        { dx: 0, dy: 0, speed: 1 },
        { dx: 0.35, dy: -0.25, speed: 0.8 },
        { dx: -0.3, dy: 0.3, speed: 0.6 },
        { dx: 0.25, dy: 0.25, speed: 0.9 },
        { dx: -0.35, dy: -0.3, speed: 0.7 },
      ];

      offsets.forEach((off, i) => {
        const blob = blobs.current[i];
        if (!blob) return;
        const px = (x + off.dx + Math.cos(t * off.speed + i * 1.7) * 0.18) * 100;
        const py = (y + off.dy + Math.sin(t * off.speed * 0.9 + i * 2.1) * 0.18) * 100;
        blob.style.transform = `translate(${px - 50}vw, ${py - 50}vh)`;
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

  // Pedir permiso de giroscopio (iOS)
  async function pedirPermisoGiro() {
    // @ts-expect-error - tipo no estándar
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        // @ts-expect-error - tipo no estándar
        const permiso = await DeviceOrientationEvent.requestPermission();
        if (permiso === "granted") {
          localStorage.setItem("fep_giro_permiso", "granted");
          window.addEventListener("deviceorientation", (e) => {
            usandoGiroRef.current = true;
            const gamma = e.gamma ?? 0;
            const beta = e.beta ?? 0;
            const x = 0.5 + Math.max(-30, Math.min(30, gamma)) / 60;
            const y = 0.5 + Math.max(-30, Math.min(30, (beta - 30))) / 60;
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

  const palette = [colors[0], colors[1] || colors[0], colors[2] || colors[0], colors[0], colors[1] || colors[0]];
  const sizes = ["140vmax", "110vmax", "120vmax", "100vmax", "130vmax"];
  const blurs = ["50px", "60px", "55px", "70px", "60px"];
  const opacityFactors = [1, 0.9, 0.85, 0.8, 0.75];

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ background: "#0a0612", zIndex: -1 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            ref={(el) => { blobs.current[i] = el; }}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: sizes[i],
              height: sizes[i],
              background: `radial-gradient(circle at center, ${palette[i]} 0%, transparent 60%)`,
              opacity: intensity * opacityFactors[i],
              filter: `blur(${blurs[i]})`,
              mixBlendMode: "screen",
              willChange: "transform",
            }}
          />
        ))}
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
        <div className="absolute inset-0 bg-black/15" />
      </div>

      {/* Prompt de permiso para giroscopio en iOS */}
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
