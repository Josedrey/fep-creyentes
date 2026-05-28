"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  colors?: string[];
  intensity?: number;
  // Si true (default), usa paleta arcoíris fija. Si false, usa colors prop tal cual (para resultado/recorrido)
  arcoiris?: boolean;
};

const esMobile = () => {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Paleta arcoíris curada para el FEP: saturados, no primarios, mezcla bien
const PALETA_ARCOIRIS = [
  "#D4145A", // magenta amante
  "#FF2D2D", // rojo rebelde
  "#FFD60A", // amarillo bufón
  "#39FF14", // verde lima explorador
  "#7B2CBF", // violeta mago
  "#00E0FF", // cian creador
  "#FF6B35", // naranja eléctrico (extra)
  "#FF1493", // rosa intenso (extra)
  "#9D4EDD", // lavanda (extra)
  "#06FFA5", // mint (extra)
];

export default function FondoLiquido({
  colors,
  intensity = 0.85,
  arcoiris = true,
}: Props) {
  const blobs = useRef<(SVGCircleElement | null)[]>(Array(10).fill(null));
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
          x: 0.5 + Math.cos(tRef.current * 0.4) * 0.15,
          y: 0.5 + Math.sin(tRef.current * 0.3) * 0.15,
        };
      }

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      const { x, y } = currentRef.current;
      const t = tRef.current;

      // 10 órbitas distribuidas en círculo amplio para cubrir más pantalla y evitar pegoteo central
      const orbits = [
        { dx: 0,     dy: 0,     sp: 0.7,  ph: 0,    rad: 0.12 },
        { dx: 35,    dy: -28,   sp: 0.6,  ph: 0.8,  rad: 0.18 },
        { dx: -35,   dy: 28,    sp: 0.55, ph: 1.6,  rad: 0.18 },
        { dx: 30,    dy: 30,    sp: 0.75, ph: 2.4,  rad: 0.16 },
        { dx: -30,   dy: -30,   sp: 0.65, ph: 3.2,  rad: 0.16 },
        { dx: 45,    dy: 5,     sp: 0.5,  ph: 4.0,  rad: 0.2  },
        { dx: -45,   dy: -5,    sp: 0.8,  ph: 4.8,  rad: 0.2  },
        { dx: 5,     dy: -42,   sp: 0.7,  ph: 5.6,  rad: 0.17 },
        { dx: -5,    dy: 42,    sp: 0.6,  ph: 6.4,  rad: 0.17 },
        { dx: 25,    dy: -10,   sp: 0.85, ph: 7.2,  rad: 0.14 },
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

  // Decidir paleta: arcoíris si así se pide o si no hay colores específicos
  let paleta: string[];
  if (arcoiris || !colors || colors.length === 0) {
    paleta = PALETA_ARCOIRIS;
  } else {
    // Modo grupo: rellenar con los colores del grupo, repetidos si son pocos, para tener 10
    paleta = [];
    for (let i = 0; i < 10; i++) {
      paleta.push(colors[i % colors.length]);
    }
  }

  // Radios variados para que no todos sean iguales
  const radios = [22, 18, 20, 16, 19, 17, 21, 15, 19, 16];

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
            {/* Goo + soft: blur grande + alpha menos extremo + soft blur final = bordes orgánicos no duros */}
            <filter id="goo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 14 -7"
                result="goo"
              />
              <feGaussianBlur in="goo" stdDeviation="1.5" />
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
