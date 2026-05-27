"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Usuario, type Sala } from "@/lib/supabase";
import {
  arquetipoDominanteGrupo, mezclarColoresHSL, nombreDelGrupo,
  colorDeArquetipo, type Arquetipo,
} from "@/lib/calculo";
import { RECORRIDOS } from "@/lib/recorridos";
import FondoLiquido from "@/components/FondoLiquido";

const claseArquetipo = (arq: Arquetipo): string => {
  const map: Record<Arquetipo, string> = {
    Amante: "arq-amante", Rebelde: "arq-rebelde", Bufon: "arq-bufon",
    Explorador: "arq-explorador", Mago: "arq-mago", Creador: "arq-creador",
  };
  return map[arq];
};

function codigoCanje(salaId: string): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < salaId.length; i++) hash = (hash * 131 + salaId.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length) + (i + 1) * 17;
  }
  return out;
}

function generarPatronQR(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0; }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h = h >>> 0; return h / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) grid[y][x] = rand() > 0.55;
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const onBorder = y === 0 || y === 6 || x === 0 || x === 6;
      const onCenter = y >= 2 && y <= 4 && x >= 2 && x <= 4;
      grid[oy + y][ox + x] = onBorder || onCenter;
    }
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      if (y === -1 || y === 7 || x === -1 || x === 7) {
        if (oy + y >= 0 && oy + y < size && ox + x >= 0 && ox + x < size) grid[oy + y][ox + x] = false;
      }
    }
  };
  drawFinder(0, 0); drawFinder(size - 7, 0); drawFinder(0, size - 7);
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
    if (!usuarioId) { router.push("/"); return; }
    (async () => {
      const { data: salaData, error: errSala } = await supabase
        .from("salas").select().eq("codigo", codigo).single();
      if (errSala || !salaData) { setError("Sala no encontrada"); return; }
      setSala(salaData);
      const { data: usuariosData } = await supabase
        .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
      if (usuariosData) setUsuarios(usuariosData);
    })();
  }, [codigo, router]);

  if (error) {
    return (
      <>
        <FondoLiquido />
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-amante font-body">{error}</p>
          <button onClick={() => router.push("/")} className="text-white/60 underline font-body">Volver al inicio</button>
        </main>
      </>
    );
  }

  if (!sala || usuarios.length === 0) {
    return (
      <>
        <FondoLiquido />
        <main className="min-h-screen flex items-center justify-center">
          <p className="eyebrow">CARGANDO RECORRIDO...</p>
        </main>
      </>
    );
  }

  const vectores = usuarios.map((u) => u.vector_arquetipos);
  const { dominante } = arquetipoDominanteGrupo(vectores);
  const colores = usuarios.map((u) => u.color || colorDeArquetipo((u.arquetipo_final as Arquetipo) || "Amante"));
  const colorGrupal = mezclarColoresHSL(colores);
  const nombre = nombreDelGrupo(sala.id, dominante);
  const recorrido = RECORRIDOS[dominante];
  const canje = codigoCanje(sala.id);
  const patron = generarPatronQR(canje);

  return (
    <>
      <FondoLiquido colors={colores} intensity={0.4} />
      <main className="min-h-screen">
        <div className="max-w-md mx-auto p-6 pt-12 pb-12 flex flex-col gap-8">

          <div className="flex flex-col gap-2 fade-up">
            <p className="eyebrow">Su recorrido en el FEP</p>
            <h1
              className={`${claseArquetipo(dominante)} leading-[0.95]`}
              style={{ fontSize: "clamp(2.25rem, 9vw, 3.5rem)", color: colorGrupal }}
            >
              {nombre}
            </h1>
          </div>

          <div className="border-l-2 pl-4 fade-up-delay-1" style={{ borderColor: colorGrupal }}>
            <p className="font-body font-light text-base text-white/85 leading-relaxed">
              {recorrido.manifiesto}
            </p>
          </div>

          <div className="flex flex-col gap-3 fade-up-delay-1">
            <p className="eyebrow">Paradas</p>
            {recorrido.paradas.map((parada, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-acento text-base flex-shrink-0"
                  style={{ backgroundColor: colorGrupal, color: "#000" }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-display text-2xl leading-tight">Tarima {parada.tarima}</p>
                  <p className="font-body font-light text-sm text-white/70 leading-snug mt-1">
                    {parada.razon}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 fade-up-delay-2">
            <p className="eyebrow">Ritual grupal</p>
            <div
              className="rounded-2xl p-4 border"
              style={{ backgroundColor: `${colorGrupal}15`, borderColor: `${colorGrupal}40` }}
            >
              <p className="font-body font-light text-sm leading-relaxed">{recorrido.ritual}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 fade-up-delay-2">
            <p className="eyebrow">Consejo</p>
            <p className="font-body italic font-light text-base text-white/85 leading-relaxed">
              “{recorrido.consejo}”
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-2 fade-up-delay-3">
            <p className="eyebrow">Canje en el festival</p>
            {!mostrarCanje ? (
              <button onClick={() => setMostrarCanje(true)} className="btn-primary w-full">
                Mostrar código de canje
              </button>
            ) : (
              <div className="bg-white text-black rounded-2xl p-5 flex flex-col items-center gap-4">
                <div className="bg-white p-3 rounded-lg" style={{ width: "200px", height: "200px" }}>
                  <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
                    {patron.map((row, y) =>
                      row.map((on, x) => on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null)
                    )}
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs tracking-[0.3em] text-black/60 font-body font-semibold">CÓDIGO</p>
                  <p className="font-acento text-3xl tracking-[0.15em] mt-1">{canje}</p>
                </div>
                <p className="text-xs text-black/60 text-center leading-relaxed px-2 font-body">
                  Muestra este código en el punto de canje del festival. Recibirán un objeto con la identidad de <strong>{nombre}</strong>.
                </p>
                <p className="text-[10px] text-black/40 text-center font-body">
                  Hashtag: <strong>#{nombre.replace(/\s+/g, "")}EnFEP</strong>
                </p>
              </div>
            )}
          </div>

          <button onClick={() => router.push("/")} className="text-white/50 text-sm underline underline-offset-4 mt-4 font-body">
            Cerrar experiencia
          </button>
        </div>
      </main>
    </>
  );
}
