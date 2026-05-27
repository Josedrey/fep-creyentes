"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Sala, type Usuario } from "@/lib/supabase";
import { calcularArquetipoFinal, colorDeArquetipo } from "@/lib/calculo";
import FondoLiquido from "@/components/FondoLiquido";

const DURACION_RITUAL_MS = 5000;

export default function Midiendo() {
  const params = useParams();
  const router = useRouter();
  const codigo = (params.codigo as string).toUpperCase();

  const [sala, setSala] = useState<Sala | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [yo, setYo] = useState<Usuario | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");

  const inicioTocadoRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const guardadoArquetipoRef = useRef(false);
  const escrituraFinalRef = useRef(false);

  const salaRef = useRef<Sala | null>(null);
  const yoRef = useRef<Usuario | null>(null);
  const usuariosRef = useRef<Usuario[]>([]);

  useEffect(() => { salaRef.current = sala; }, [sala]);
  useEffect(() => { yoRef.current = yo; }, [yo]);
  useEffect(() => { usuariosRef.current = usuarios; }, [usuarios]);

  const guardarMiArquetipo = useCallback(async (usuario: Usuario) => {
    if (guardadoArquetipoRef.current) return;
    if (usuario.arquetipo_final) { guardadoArquetipoRef.current = true; return; }
    guardadoArquetipoRef.current = true;
    const arq = calcularArquetipoFinal(usuario.vector_arquetipos);
    const color = colorDeArquetipo(arq);
    await supabase.from("usuarios").update({ arquetipo_final: arq, color }).eq("id", usuario.id);
  }, []);

  useEffect(() => {
    const usuarioId = localStorage.getItem("fep_usuario_id");
    if (!usuarioId) { router.push("/"); return; }

    let canalSala: ReturnType<typeof supabase.channel> | null = null;
    let canalUsuarios: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: salaData, error: errSala } = await supabase
        .from("salas").select().eq("codigo", codigo).single();
      if (errSala || !salaData) { setError("Sala no encontrada"); return; }
      setSala(salaData);
      if (salaData.estado === "resultado") { router.push(`/sala/${codigo}/resultado`); return; }

      const { data: usuariosData } = await supabase
        .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
      if (usuariosData) {
        setUsuarios(usuariosData);
        const yoData = usuariosData.find((u) => u.id === usuarioId);
        if (yoData) { setYo(yoData); guardarMiArquetipo(yoData); }
      }

      canalSala = supabase.channel(`midiendo-sala-${salaData.id}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaData.id}` },
          (payload) => {
            const nueva = payload.new as Sala;
            setSala(nueva);
            if (nueva.estado === "resultado") router.push(`/sala/${codigo}/resultado`);
          }
        ).subscribe();

      canalUsuarios = supabase.channel(`midiendo-usuarios-${salaData.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "usuarios", filter: `sala_id=eq.${salaData.id}` },
          async () => {
            const { data } = await supabase
              .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
            if (data) {
              setUsuarios(data);
              const yoData = data.find((u) => u.id === usuarioId);
              if (yoData) setYo(yoData);
            }
          }
        ).subscribe();
    })();

    return () => {
      canalSala?.unsubscribe();
      canalUsuarios?.unsubscribe();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [codigo, router, guardarMiArquetipo]);

  const dispararResultado = useCallback(async () => {
    if (escrituraFinalRef.current) return;
    const salaActual = salaRef.current;
    const yoActual = yoRef.current;
    if (!salaActual || !yoActual || !yoActual.es_anfitrion) return;
    escrituraFinalRef.current = true;
    await supabase.from("salas").update({ estado: "resultado" }).eq("id", salaActual.id);
  }, []);

  const setMiTocando = useCallback(async (valor: boolean) => {
    const yoActual = yoRef.current;
    if (!yoActual) return;
    await supabase.from("usuarios").update({ tocando: valor }).eq("id", yoActual.id);
  }, []);

  useEffect(() => {
    if (!sala || usuarios.length < 2) return;
    const todosTocan = usuarios.every((u) => u.tocando);

    if (todosTocan) {
      if (inicioTocadoRef.current === null) inicioTocadoRef.current = performance.now();
      const tick = () => {
        if (inicioTocadoRef.current === null) return;
        const usuariosActuales = usuariosRef.current;
        const siguenTodos = usuariosActuales.length >= 2 && usuariosActuales.every((u) => u.tocando);
        if (!siguenTodos) { inicioTocadoRef.current = null; return; }
        const transcurrido = performance.now() - inicioTocadoRef.current;
        const p = Math.min(1, transcurrido / DURACION_RITUAL_MS);
        setProgreso(p);
        if (p >= 1) { dispararResultado(); return; }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      inicioTocadoRef.current = null;
      setProgreso(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [usuarios, sala, dispararResultado]);

  useEffect(() => {
    return () => {
      const yoActual = yoRef.current;
      if (yoActual) supabase.from("usuarios").update({ tocando: false }).eq("id", yoActual.id);
    };
  }, []);

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

  if (!sala || !yo) {
    return (
      <>
        <FondoLiquido />
        <main className="min-h-screen flex items-center justify-center">
          <p className="eyebrow">CONECTANDO...</p>
        </main>
      </>
    );
  }

  const cuantosTocan = usuarios.filter((u) => u.tocando).length;
  const totalUsuarios = usuarios.length;
  const todosTocan = cuantosTocan === totalUsuarios && totalUsuarios >= 2;

  return (
    <>
      <FondoLiquido
        colors={todosTocan ? ["#D4145A", "#7B2CBF", "#00E0FF"] : ["#7B2CBF", "#1a0f24", "#0a0612"]}
        intensity={todosTocan ? 0.4 + progreso * 0.5 : 0.25}
      />
      <main
        className="min-h-screen flex flex-col items-center justify-between p-6 pt-12 pb-8 select-none"
        style={{ touchAction: "none" }}
      >
        <div className="w-full max-w-md flex flex-col items-center gap-3 text-center fade-up">
          <p className="eyebrow">Ritual de revelación</p>
          <h1
            className="font-display leading-[0.95]"
            style={{ fontSize: "clamp(2.2rem, 8vw, 3.25rem)" }}
          >
            {todosTocan ? "Sostengan así..." : "Sostengan todxs el círculo"}
          </h1>
          <p className="font-body font-light text-sm text-white/70 max-w-xs leading-relaxed mt-2">
            {todosTocan ? "No suelten hasta que la onda se complete." : "Si alguien suelta, el ritual se reinicia."}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            className="relative w-64 h-64 rounded-full flex items-center justify-center"
            onPointerDown={() => setMiTocando(true)}
            onPointerUp={() => setMiTocando(false)}
            onPointerLeave={() => setMiTocando(false)}
            onPointerCancel={() => setMiTocando(false)}
            aria-label="Sostener para el ritual"
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              <circle
                cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={`${progreso * 289} 289`} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.1s linear" }}
              />
            </svg>
            <div
              className={`w-48 h-48 rounded-full transition-all duration-500 ${
                yo.tocando ? "bg-white scale-100" : "bg-white/30 scale-90"
              } ${todosTocan ? "pulse-glow" : ""}`}
            />
          </button>
          <p className="eyebrow">
            {cuantosTocan} de {totalUsuarios} sostienen
          </p>
        </div>

        <div className="w-full max-w-md flex flex-wrap justify-center gap-2">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className={`px-3 py-1 rounded-full text-xs font-body transition ${
                u.tocando ? "bg-white text-black font-bold" : "bg-white/10 text-white/50"
              }`}
            >
              {u.nombre}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
