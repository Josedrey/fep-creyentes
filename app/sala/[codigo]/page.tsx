"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Sala, type Usuario } from "@/lib/supabase";

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
    if (!usuarioId) {
      router.push("/");
      return;
    }

    let canalUsuarios: ReturnType<typeof supabase.channel> | null = null;
    let canalSala: ReturnType<typeof supabase.channel> | null = null;

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

      if (usuariosData) {
        setUsuarios(usuariosData);
        const yoData = usuariosData.find((u) => u.id === usuarioId);
        if (yoData) setYo(yoData);
      }

      canalUsuarios = supabase
        .channel(`sala-usuarios-${salaData.id}`)
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
            if (data) setUsuarios(data);
          }
        )
        .subscribe();

      canalSala = supabase
        .channel(`sala-estado-${salaData.id}`)
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
            if (nueva.estado === "preguntas") {
              router.push(`/sala/${codigo}/pregunta`);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      canalUsuarios?.unsubscribe();
      canalSala?.unsubscribe();
    };
  }, [codigo, router]);

  async function iniciar() {
    if (!sala || usuarios.length < 2) return;
    await supabase
      .from("salas")
      .update({ estado: "preguntas" })
      .eq("id", sala.id);
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-rebelde">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-white/60 underline"
        >
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

  const puedeIniciar = usuarios.length >= 2 && yo.es_anfitrion;
  const anfitrion = usuarios.find((u) => u.es_anfitrion);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 pt-16 pb-8">
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        <p className="text-xs tracking-[0.3em] text-white/60">CÓDIGO DE SALA</p>
        <h1 className="text-7xl font-bold tracking-[0.15em]">
          {sala.codigo}
        </h1>
        <p className="text-sm text-white/70 text-center mt-4 max-w-xs leading-relaxed">
          Comparte el código con tu grupo. La revelación inicia cuando estén todxs.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <p className="text-xs tracking-[0.3em] text-white/60">
          {usuarios.length} {usuarios.length === 1 ? "PERSONA" : "PERSONAS"}
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition ${
                u.id === yo.id
                  ? "bg-white text-black font-semibold"
                  : "bg-white/10 border border-white/20"
              }`}
            >
              <span>{u.nombre}</span>
              {u.es_anfitrion && (
                <span className="text-[10px] opacity-60">★</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        {yo.es_anfitrion ? (
          <button
            onClick={iniciar}
            disabled={!puedeIniciar}
            className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {usuarios.length < 2
              ? "Esperando a tu grupo..."
              : "Iniciar la revelación"}
          </button>
        ) : (
          <p className="text-center text-white/60 text-sm">
            Esperando a que {anfitrion?.nombre || "el anfitrión"} inicie.
          </p>
        )}
      </div>
    </main>
  );
}
