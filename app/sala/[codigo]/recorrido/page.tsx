"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Usuario, type Sala } from "@/lib/supabase";
import {
  arquetipoDominanteGrupo,
  mezclarColoresHSL,
  nombreDelGrupo,
  colorDeArquetipo,
  type Arquetipo,
} from "@/lib/calculo";
import { RECORRIDOS } from "@/lib/recorridos";

// Genera un código alfanumérico determinístico de 8 chars desde el sala.id (sirve como ID de canje ficcional)
function codigoCanje(salaId: string): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < salaId.length; i++) {
    hash = (hash * 131 + salaId.charCodeAt(i)) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length) + (i + 1) * 17;
  }
  return out;
}

// "QR" ficcional: rejilla 21x21 determinística desde el código. No es un QR real,
// es una representación visual estilo QR para el momento narrativo.
function generarPatronQR(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Hash determinístico
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h = h >>> 0;
    return h / 4294967296;
  };

  // Llenado pseudoaleatorio
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = rand() > 0.55;
    }
  }

  // Esquinas estilo QR (finder patterns)
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const onBorder = y === 0 || y === 6 || x === 0 || x === 6;
        const onCenter = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        grid[oy + y][ox + x] = onBorder || onCenter;
      }
    }
    // Margen blanco alrededor
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        if (y === -1 || y === 7 || x === -1 || x === 7) {
          if (oy + y >= 0 && oy + y < size && ox + x >= 0 && ox + x < size) {
            grid[oy + y][ox + x] = false;
          }
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  return grid;
}

export default function Recorrido() {
  const params = useParams();
  const router = useRouter();
  const codigo = (params.codigo as string).toUpperCase();

  const [sala, setSala] = useState<Sala | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState("");
  const [mostrarCanje, setMostrarCanje] = useState(false);

  useEffect(() => {
    const usuarioId = localStorage.getItem("fep_usuario_id");
    if (!usuarioId) {
      router.push("/");
      return;
    }
    (async () => {
      const { data: salaData, error: errSala } = await supabase
        .from("salas")
        .select()
        .eq("codigo", codigo)
        .single();
      if (errSala || !salaData) {
        setError("Sala no encontrada");
        return;
      }
      setSala(salaData);

      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select()
        .eq("sala_id", salaData.id)
        .order("created_at");
      if (usuariosData) setUsuarios(usuariosData);
    })();
  }, [codigo, router]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-rebelde">{error}</p>
        <button onClick={() => router.push("/")} className="text-white/60 underline">
          Volver al inicio
        </button>
      </main>
    );
  }

  if (!sala || usuarios.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/60 text-sm tracking-[0.2em]">CARGANDO RECORRIDO...</p>
      </main>
    );
  }

  // === Cálculos ===
  const vectores = usuarios.map((u) => u.vector_arquetipos);
  const { dominante } = arquetipoDominanteGrupo(vectores);
  const colores = usuarios.map((u) =>
    u.color || colorDeArquetipo((u.arquetipo_final as Arquetipo) || "Amante")
  );
  const colorGrupal = mezclarColoresHSL(colores);
  const nombre = nombreDelGrupo(sala.id, dominante);
  const recorrido = RECORRIDOS[dominante];
  const canje = codigoCanje(sala.id);
  const patron = generarPatronQR(canje);

  return (
    <main className="min-h-screen relative">
      {/* Background sutil con el color grupal */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${colorGrupal}, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-md mx-auto p-6 pt-12 pb-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.3em] text-white/60">SU RECORRIDO EN EL FEP</p>
          <h1 className="text-4xl font-bold leading-tight" style={{ color: colorGrupal }}>
            {nombre}
          </h1>
        </div>

        {/* Manifiesto del grupo */}
        <div className="border-l-2 pl-4" style={{ borderColor: colorGrupal }}>
          <p className="text-base text-white/85 leading-relaxed">
            {recorrido.manifiesto}
          </p>
        </div>

        {/* Paradas */}
        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.3em] text-white/60">PARADAS</p>
          {recorrido.paradas.map((parada, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: colorGrupal, color: "#000" }}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">Tarima {parada.tarima}</p>
                <p className="text-sm text-white/70 leading-snug mt-1">
                  {parada.razon}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Ritual grupal */}
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.3em] text-white/60">RITUAL GRUPAL</p>
          <div
            className="rounded-2xl p-4 border"
            style={{
              backgroundColor: `${colorGrupal}15`,
              borderColor: `${colorGrupal}40`,
            }}
          >
            <p className="text-sm leading-relaxed">{recorrido.ritual}</p>
          </div>
        </div>

        {/* Consejo */}
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.3em] text-white/60">CONSEJO</p>
          <p className="text-base text-white/85 italic leading-relaxed">
            “{recorrido.consejo}”
          </p>
        </div>

        {/* Sección de canje */}
        <div className="flex flex-col gap-3 mt-2">
          <p className="text-xs tracking-[0.3em] text-white/60">CANJE EN EL FESTIVAL</p>
          {!mostrarCanje ? (
            <button
              onClick={() => setMostrarCanje(true)}
              className="w-full bg-white text-black font-semibold py-4 rounded-2xl text-base active:scale-95 transition"
            >
              Mostrar código de canje
            </button>
          ) : (
            <div className="bg-white text-black rounded-2xl p-5 flex flex-col items-center gap-4">
              {/* Patrón estilo QR */}
              <div
                className="bg-white p-3 rounded-lg"
                style={{ width: "200px", height: "200px" }}
              >
                <svg
                  viewBox="0 0 21 21"
                  className="w-full h-full"
                  shapeRendering="crispEdges"
                >
                  {patron.map((row, y) =>
                    row.map((on, x) =>
                      on ? (
                        <rect
                          key={`${x}-${y}`}
                          x={x}
                          y={y}
                          width={1}
                          height={1}
                          fill="#000"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs tracking-[0.3em] text-black/60">CÓDIGO</p>
                <p className="text-2xl font-bold tracking-[0.2em] mt-1">{canje}</p>
              </div>
              <p className="text-xs text-black/60 text-center leading-relaxed px-2">
                Muestra este código en el punto de canje del festival. Recibirán un objeto
                con la identidad de <strong>{nombre}</strong>.
              </p>
              <p className="text-[10px] text-black/40 text-center">
                Hashtag: <strong>#{nombre.replace(/\s+/g, "")}EnFEP</strong>
              </p>
            </div>
          )}
        </div>

        {/* Botón final */}
        <button
          onClick={() => router.push("/")}
          className="text-white/50 text-sm underline underline-offset-4 mt-4"
        >
          Cerrar experiencia
        </button>
      </div>
    </main>
  );
}
