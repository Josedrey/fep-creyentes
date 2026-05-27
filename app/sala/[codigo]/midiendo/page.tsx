"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Sala, type Usuario } from "@/lib/supabase";
import { calcularArquetipoFinal, colorDeArquetipo } from "@/lib/calculo";

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
  const escrituraFinalRef = useRef(false); // evita múltiples writes

  // Refs sincronizadas con el estado para leer valores frescos dentro de callbacks
  const salaRef = useRef<Sala | null>(null);
  const yoRef = useRef<Usuario | null>(null);
  const usuariosRef = useRef<Usuario[]>([]);

  useEffect(() => { salaRef.current = sala; }, [sala]);
  useEffect(() => { yoRef.current = yo; }, [yo]);
  useEffect(() => { usuariosRef.current = usuarios; }, [usuarios]);

  const guardarMiArquetipo = useCallback(async (usuario: Usuario) => {
    if (guardadoArquetipoRef.current) return;
    if (usuario.arquetipo_final) {
      guardadoArquetipoRef.current = true;
      return;
    }
    guardadoArquetipoRef.current = true;
    const arq = calcularArquetipoFinal(usuario.vector_arquetipos);
    const color = colorDeArquetipo(arq);
    await supabase
      .from("usuarios")
      .update({ arquetipo_final: arq, color })
      .eq("id", usuario.id);
  }, []);

  useEffect(() => {
    const usuarioId = localStorage.getItem("fep_usuario_id");
    if (!usuarioId) {
      router.push("/");
      return;
    }

    let canalSala: ReturnType<typeof supabase.channel> | null = null;
    let canalUsuarios: ReturnType<typeof supabase.channel> | null = null;

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

      // Si ya pasó a resultado mientras llegabas, redirige
      if (salaData.estado === "resultado") {
        router.push(`/sala/${codigo}/resultado`);
        return;
      }

      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select()
        .eq("sala_id", salaData.id)
        .order("created_at");

      if (usuariosData) {
        setUsuarios(usuariosData);
        const yoData = usuariosData.find((u) => u.id === usuarioId);
        if (yoData) {
          setYo(yoData);
          guardarMiArquetipo(yoData);
        }
      }

      canalSala = supabase
        .channel(`midiendo-sala-${salaData.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "salas",
            filter: `id=eq.${salaData.id}`,
          },
          (payload) => {
            const nueva = payload.new as Sala;
            setSala(nueva);
            if (nueva.estado === "resultado") {
              router.push(`/sala/${codigo}/resultado`);
            }
          }
        )
        .subscribe();

      canalUsuarios = supabase
        .channel(`midiendo-usuarios-${salaData.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "usuarios",
            filter: `sala_id=eq.${salaData.id}`,
          },
          async () => {
            const { data } = await supabase
              .from("usuarios")
              .select()
              .eq("sala_id", salaData.id)
              .order("created_at");
            if (data) {
              setUsuarios(data);
              const yoData = data.find((u) => u.id === usuarioId);
              if (yoData) setYo(yoData);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      canalSala?.unsubscribe();
      canalUsuarios?.unsubscribe();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [codigo, router, guardarMiArquetipo]);

  // Función para escribir el resultado final - usa refs para evitar closures obsoletos
  const dispararResultado = useCallback(async () => {
    if (escrituraFinalRef.current) return;
    const salaActual = salaRef.current;
    const yoActual = yoRef.current;
    if (!salaActual || !yoActual) return;
    if (!yoActual.es_anfitrion) return;
    escrituraFinalRef.current = true;
    await supabase
      .from("salas")
      .update({ estado: "resultado" })
      .eq("id", salaActual.id);
  }, []);

  // Marcar mi tocando en BD
  const setMiTocando = useCallback(
    async (valor: boolean) => {
      const yoActual = yoRef.current;
      if (!yoActual) return;
      await supabase.from("usuarios").update({ tocando: valor }).eq("id", yoActual.id);
    },
    []
  );

  // Loop de progreso. Lee SIEMPRE de refs, no de closures.
  useEffect(() => {
    if (!sala || usuarios.length < 2) return;

    const todosTocan = usuarios.every((u) => u.tocando);

    if (todosTocan) {
      if (inicioTocadoRef.current === null) {
        inicioTocadoRef.current = performance.now();
      }
      const tick = () => {
        if (inicioTocadoRef.current === null) return;

        // Verificar en cada frame si todos siguen tocando (desde ref)
        const usuariosActuales = usuariosRef.current;
        const siguenTodos =
          usuariosActuales.length >= 2 && usuariosActuales.every((u) => u.tocando);

        if (!siguenTodos) {
          inicioTocadoRef.current = null;
          return;
        }

        const transcurrido = performance.now() - inicioTocadoRef.current;
        const p = Math.min(1, transcurrido / DURACION_RITUAL_MS);
        setProgreso(p);

        if (p >= 1) {
          // Cualquiera dispara, pero solo el anfitrión escribe (validación dentro)
          dispararResultado();
          return;
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      inicioTocadoRef.current = null;
      setProgreso(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [usuarios, sala, dispararResultado]);

  // Limpiar tocando al desmontar
  useEffect(() => {
    return () => {
      const yoActual = yoRef.current;
      if (yoActual) {
        supabase.from("usuarios").update({ tocando: false }).eq("id", yoActual.id);
      }
    };
  }, []);

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

  if (!sala || !yo) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/60 text-sm tracking-[0.2em]">CONECTANDO...</p>
      </main>
    );
  }

  const cuantosTocan = usuarios.filter((u) => u.tocando).length;
  const totalUsuarios = usuarios.length;
  const todosTocan = cuantosTocan === totalUsuarios && totalUsuarios >= 2;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-between p-6 pt-12 pb-8 select-none"
      style={{ touchAction: "none" }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-3 text-center">
        <p className="text-xs tracking-[0.3em] text-white/60">RITUAL DE REVELACIÓN</p>
        <h1 className="text-3xl font-bold leading-tight">
          {todosTocan ? "Sostengan así..." : "Sostengan todxs el círculo"}
        </h1>
        <p className="text-sm text-white/60 max-w-xs leading-relaxed">
          {todosTocan
            ? "No suelten hasta que la onda se complete."
            : "Si alguien suelta, el ritual se reinicia."}
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
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeDasharray={`${progreso * 289} 289`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.1s linear" }}
            />
          </svg>
          <div
            className={`w-48 h-48 rounded-full transition-all duration-500 ${
              yo.tocando ? "bg-white scale-100" : "bg-white/30 scale-90"
            } ${todosTocan ? "animate-pulse" : ""}`}
          />
        </button>

        <p className="text-xs tracking-[0.3em] text-white/60">
          {cuantosTocan} DE {totalUsuarios} SOSTIENEN
        </p>
      </div>

      <div className="w-full max-w-md flex flex-wrap justify-center gap-2">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className={`px-3 py-1 rounded-full text-xs transition ${
              u.tocando ? "bg-white text-black font-semibold" : "bg-white/10 text-white/50"
            }`}
          >
            {u.nombre}
          </div>
        ))}
      </div>
    </main>
  );
}
