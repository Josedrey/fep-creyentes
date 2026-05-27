"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Sala, type Usuario } from "@/lib/supabase";
import FondoLiquido from "@/components/FondoLiquido";

export default function SalaEspera() {
  const params = useParams();
  const router = useRouter();
  const codigo = (params.codigo as string).toUpperCase();

  const [sala, setSala] = useState<Sala | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [yo, setYo] = useState<Usuario | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const usuarioId = localStorage.getItem("fep_usuario_id");
    if (!usuarioId) { router.push("/"); return; }

    let canalUsuarios: ReturnType<typeof supabase.channel> | null = null;
    let canalSala: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: salaData, error: errSala } = await supabase
        .from("salas").select().eq("codigo", codigo).single();
      if (errSala || !salaData) { setError("Sala no encontrada"); return; }
      setSala(salaData);

      const { data: usuariosData } = await supabase
        .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
      if (usuariosData) {
        setUsuarios(usuariosData);
        const yoData = usuariosData.find((u) => u.id === usuarioId);
        if (yoData) setYo(yoData);
      }

      canalUsuarios = supabase
        .channel(`sala-usuarios-${salaData.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "usuarios", filter: `sala_id=eq.${salaData.id}` },
          async () => {
            const { data } = await supabase
              .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
            if (data) setUsuarios(data);
          }
        ).subscribe();

      canalSala = supabase
        .channel(`sala-estado-${salaData.id}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaData.id}` },
          (payload) => {
            const nueva = payload.new as Sala;
            setSala(nueva);
            if (nueva.estado === "preguntas") router.push(`/sala/${codigo}/pregunta`);
          }
        ).subscribe();
    })();

    return () => {
      canalUsuarios?.unsubscribe();
      canalSala?.unsubscribe();
    };
  }, [codigo, router]);

  async function iniciar() {
    if (!sala || usuarios.length < 2) return;
    await supabase.from("salas").update({ estado: "preguntas" }).eq("id", sala.id);
  }

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

  const puedeIniciar = usuarios.length >= 2 && yo.es_anfitrion;
  const anfitrion = usuarios.find((u) => u.es_anfitrion);

  return (
    <>
      <FondoLiquido colors={["#7B2CBF", "#D4145A", "#00E0FF"]} intensity={0.5} />
      <main className="min-h-screen flex flex-col items-center justify-between p-6 pt-16 pb-10">

        <div className="w-full max-w-md flex flex-col items-center gap-3 fade-up">
          <p className="eyebrow">Código de sala</p>
          <h1
            className="font-acento tracking-[0.15em] mt-2"
            style={{ fontSize: "clamp(4rem, 18vw, 6rem)" }}
          >
            {sala.codigo}
          </h1>
          <p className="font-body font-light text-sm text-white/75 text-center mt-4 max-w-xs leading-relaxed">
            Comparte el código con tu grupo.<br/>La revelación inicia cuando estén todxs.
          </p>
        </div>

        <div className="w-full max-w-md flex flex-col items-center gap-4 fade-up-delay-1">
          <p className="eyebrow">
            {usuarios.length} {usuarios.length === 1 ? "persona" : "personas"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className={`px-4 py-2 rounded-full text-sm font-body flex items-center gap-2 transition ${
                  u.id === yo.id
                    ? "bg-white text-black font-bold"
                    : "bg-white/10 border border-white/20"
                }`}
              >
                <span>{u.nombre}</span>
                {u.es_anfitrion && <span className="text-[10px] opacity-60">★</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md fade-up-delay-2">
          {yo.es_anfitrion ? (
            <button onClick={iniciar} disabled={!puedeIniciar} className="btn-primary w-full">
              {usuarios.length < 2 ? "Esperando a tu grupo..." : "Iniciar la revelación"}
            </button>
          ) : (
            <p className="text-center text-white/60 text-sm font-body">
              Esperando a que {anfitrion?.nombre || "el anfitrión"} inicie.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
