"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, generarCodigoSala } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [modo, setModo] = useState<"inicio" | "crear" | "unirse">("inicio");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function crearSala() {
    if (!nombre.trim()) {
      setError("Necesitas un nombre");
      return;
    }
    setLoading(true);
    setError("");

    const nuevoCodigo = generarCodigoSala();

    const { data: sala, error: errSala } = await supabase
      .from("salas")
      .insert({ codigo: nuevoCodigo })
      .select()
      .single();

    if (errSala || !sala) {
      setError("No pudimos crear la sala. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    const { data: usuario, error: errUsuario } = await supabase
      .from("usuarios")
      .insert({
        sala_id: sala.id,
        nombre: nombre.trim(),
        es_anfitrion: true,
      })
      .select()
      .single();

    if (errUsuario || !usuario) {
      setError("Error al unirte a la sala.");
      setLoading(false);
      return;
    }

    localStorage.setItem("fep_usuario_id", usuario.id);
    router.push(`/sala/${sala.codigo}`);
  }

  async function unirseSala() {
    if (!nombre.trim()) {
      setError("Necesitas un nombre");
      return;
    }
    if (!codigo.trim()) {
      setError("Necesitas el código de la sala");
      return;
    }
    setLoading(true);
    setError("");

    const codigoUpper = codigo.trim().toUpperCase();

    const { data: sala, error: errSala } = await supabase
      .from("salas")
      .select()
      .eq("codigo", codigoUpper)
      .single();

    if (errSala || !sala) {
      setError("Sala no encontrada");
      setLoading(false);
      return;
    }

    if (sala.estado !== "esperando") {
      setError("La sala ya empezó. Pídeles que creen una nueva.");
      setLoading(false);
      return;
    }

    const { data: usuario, error: errUsuario } = await supabase
      .from("usuarios")
      .insert({
        sala_id: sala.id,
        nombre: nombre.trim(),
        es_anfitrion: false,
      })
      .select()
      .single();

    if (errUsuario || !usuario) {
      setError("Error al unirte.");
      setLoading(false);
      return;
    }

    localStorage.setItem("fep_usuario_id", usuario.id);
    router.push(`/sala/${sala.codigo}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 pt-20 pb-8">
      <div className="w-full max-w-md flex flex-col items-center gap-2">
        <p className="text-xs tracking-[0.3em] text-white/60">FEP 2026 · CREYENTES</p>
        <h1 className="text-5xl font-bold text-center leading-[0.95] mt-2">
          INICIACIÓN<br />DE CREYENTES
        </h1>
        <p className="text-sm text-white/70 text-center mt-6 max-w-xs leading-relaxed">
          Descubre la identidad sonora que tu grupo ha construido juntx.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {modo === "inicio" && (
          <>
            <button
              onClick={() => setModo("crear")}
              className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition"
            >
              Crear sala
            </button>
            <button
              onClick={() => setModo("unirse")}
              className="w-full border border-white/30 font-semibold py-4 rounded-full text-lg active:scale-95 transition"
            >
              Unirme con código
            </button>
          </>
        )}

        {modo === "crear" && (
          <>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 px-5 py-4 rounded-full text-lg focus:outline-none focus:border-white"
              autoFocus
            />
            <button
              onClick={crearSala}
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear sala"}
            </button>
            <button
              onClick={() => { setModo("inicio"); setError(""); }}
              className="text-white/60 text-sm py-2"
            >
              ← Volver
            </button>
          </>
        )}

        {modo === "unirse" && (
          <>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 px-5 py-4 rounded-full text-lg focus:outline-none focus:border-white"
              autoFocus
            />
            <input
              type="text"
              placeholder="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full bg-white/10 border border-white/20 px-5 py-4 rounded-full text-2xl uppercase tracking-[0.4em] text-center focus:outline-none focus:border-white"
            />
            <button
              onClick={unirseSala}
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition disabled:opacity-50"
            >
              {loading ? "Conectando..." : "Unirme"}
            </button>
            <button
              onClick={() => { setModo("inicio"); setError(""); }}
              className="text-white/60 text-sm py-2"
            >
              ← Volver
            </button>
          </>
        )}

        {error && (
          <p className="text-rebelde text-sm text-center">{error}</p>
        )}
      </div>

      <p className="text-xs text-white/40 text-center max-w-xs leading-relaxed">
        Esta experiencia solo funciona con dos o más personas.
      </p>
    </main>
  );
}
