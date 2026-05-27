"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Sala, type Usuario, type VectorArquetipos } from "@/lib/supabase";
import { PREGUNTAS } from "@/lib/preguntas";

export default function PantallaPregunta() {
  const params = useParams();
  const router = useRouter();
  const codigo = (params.codigo as string).toUpperCase();

  const [sala, setSala] = useState<Sala | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [yo, setYo] = useState<Usuario | null>(null);
  const [respuestasPregunta, setRespuestasPregunta] = useState<{ usuario_id: string }[]>([]);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const recargarRespuestas = useCallback(async (salaId: string, preguntaActual: number) => {
    const { data: usuariosData } = await supabase
      .from("usuarios")
      .select("id")
      .eq("sala_id", salaId);
    const ids = (usuariosData || []).map((u) => u.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("respuestas")
      .select("usuario_id")
      .eq("pregunta_id", preguntaActual)
      .in("usuario_id", ids);
    if (data) setRespuestasPregunta(data);
  }, []);

  useEffect(() => {
    const usuarioId = localStorage.getItem("fep_usuario_id");
    if (!usuarioId) {
      router.push("/");
      return;
    }

    let canalSala: ReturnType<typeof supabase.channel> | null = null;
    let canalUsuarios: ReturnType<typeof supabase.channel> | null = null;
    let canalRespuestas: ReturnType<typeof supabase.channel> | null = null;

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

      await recargarRespuestas(salaData.id, salaData.pregunta_actual);

      // Realtime: cambios de estado de la sala
      canalSala = supabase
        .channel(`pregunta-sala-${salaData.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "salas",
            filter: `id=eq.${salaData.id}`,
          },
          async (payload) => {
            const nueva = payload.new as Sala;
            setSala(nueva);
            if (nueva.estado === "midiendo") {
              router.push(`/sala/${codigo}/midiendo`);
              return;
            }
            // Si avanzó la pregunta, resetear UI local
            setOpcionSeleccionada(null);
            setEnviando(false);
            await recargarRespuestas(salaData.id, nueva.pregunta_actual);
          }
        )
        .subscribe();

      // Realtime: cambios en usuarios (vector_arquetipos)
      canalUsuarios = supabase
        .channel(`pregunta-usuarios-${salaData.id}`)
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

      // Realtime: nuevas respuestas para la pregunta actual
      canalRespuestas = supabase
        .channel(`pregunta-respuestas-${salaData.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "respuestas",
          },
          async () => {
            // Recargar usando el estado más reciente de la sala
            const { data: salaActual } = await supabase
              .from("salas")
              .select("pregunta_actual")
              .eq("id", salaData.id)
              .single();
            if (salaActual) {
              await recargarRespuestas(salaData.id, salaActual.pregunta_actual);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      canalSala?.unsubscribe();
      canalUsuarios?.unsubscribe();
      canalRespuestas?.unsubscribe();
    };
  }, [codigo, router, recargarRespuestas]);

  const yaRespondi = !!yo && respuestasPregunta.some((r) => r.usuario_id === yo.id);

  async function responder(opcionIdx: number) {
    if (!yo || !sala || yaRespondi || enviando) return;
    setEnviando(true);
    setOpcionSeleccionada(opcionIdx);

    const pregunta = PREGUNTAS[sala.pregunta_actual];
    const opcion = pregunta.opciones[opcionIdx];

    // Insertar respuesta (sirve de marcador de "ya respondió")
    const { error: errResp } = await supabase.from("respuestas").insert({
      usuario_id: yo.id,
      pregunta_id: pregunta.id,
      opcion: opcionIdx,
    });

    if (errResp) {
      setError("No pudimos guardar tu respuesta. Reintenta.");
      setEnviando(false);
      setOpcionSeleccionada(null);
      return;
    }

    // Actualizar vector de arquetipos sumando los puntos
    const nuevoVector: VectorArquetipos = { ...yo.vector_arquetipos };
    for (const [arquetipo, pts] of Object.entries(opcion.puntos)) {
      const key = arquetipo as keyof VectorArquetipos;
      nuevoVector[key] = (nuevoVector[key] || 0) + (pts as number);
    }

    await supabase
      .from("usuarios")
      .update({ vector_arquetipos: nuevoVector })
      .eq("id", yo.id);

    setEnviando(false);
  }

  async function avanzar() {
    if (!sala || !yo?.es_anfitrion) return;
    const siguiente = sala.pregunta_actual + 1;
    if (siguiente >= PREGUNTAS.length) {
      await supabase
        .from("salas")
        .update({ estado: "midiendo" })
        .eq("id", sala.id);
    } else {
      await supabase
        .from("salas")
        .update({ pregunta_actual: siguiente })
        .eq("id", sala.id);
    }
  }

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

  const pregunta = PREGUNTAS[sala.pregunta_actual];
  const total = usuarios.length;
  const respondieron = respuestasPregunta.length;
  const todosRespondieron = respondieron >= total && total > 0;
  const esUltima = sala.pregunta_actual >= PREGUNTAS.length - 1;

  return (
    <main className="min-h-screen flex flex-col p-6 pt-12 pb-8">
      {/* Header con progreso */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 mb-8">
        <div className="flex gap-2">
          {PREGUNTAS.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-10 rounded-full transition ${
                i < sala.pregunta_actual
                  ? "bg-white"
                  : i === sala.pregunta_actual
                  ? "bg-white"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
        <p className="text-xs tracking-[0.3em] text-white/60">
          PREGUNTA {sala.pregunta_actual + 1} DE {PREGUNTAS.length}
        </p>
      </div>

      {/* Pregunta */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <h1 className="text-3xl font-bold text-center leading-tight mb-8">
          {pregunta.texto}
        </h1>

        {/* Opciones */}
        <div className="flex flex-col gap-3 mb-8">
          {pregunta.opciones.map((opcion, idx) => {
            const esSeleccionada = opcionSeleccionada === idx;
            const disabled = yaRespondi || enviando;
            return (
              <button
                key={idx}
                onClick={() => responder(idx)}
                disabled={disabled}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition active:scale-[0.98] ${
                  esSeleccionada
                    ? "bg-white text-black border-white font-semibold"
                    : "bg-white/5 border-white/20 hover:bg-white/10 disabled:opacity-40"
                }`}
              >
                {opcion.texto}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer: indicador de progreso grupal + botón anfitrión */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3">
        <p className="text-xs tracking-[0.3em] text-white/60">
          {respondieron} DE {total} RESPONDIERON
        </p>

        {/* Dots de quién respondió */}
        <div className="flex gap-2 mb-2">
          {usuarios.map((u) => {
            const respondio = respuestasPregunta.some((r) => r.usuario_id === u.id);
            return (
              <div
                key={u.id}
                className={`w-2 h-2 rounded-full transition ${
                  respondio ? "bg-white" : "bg-white/20"
                }`}
                title={u.nombre}
              />
            );
          })}
        </div>

        {yo.es_anfitrion ? (
          <button
            onClick={avanzar}
            disabled={!todosRespondieron}
            className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {!todosRespondieron
              ? "Esperando al resto..."
              : esUltima
              ? "Revelar al grupo"
              : "Siguiente pregunta"}
          </button>
        ) : yaRespondi ? (
          <p className="text-center text-white/60 text-sm">
            {todosRespondieron
              ? "Esperando al anfitrión..."
              : "Esperando al resto del grupo..."}
          </p>
        ) : (
          <p className="text-center text-white/40 text-sm">
            Elige tu respuesta arriba
          </p>
        )}
      </div>
    </main>
  );
}
