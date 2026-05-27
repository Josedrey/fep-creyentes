"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, generarCodigoSala } from "@/lib/supabase";
import FondoLiquido from "@/components/FondoLiquido";

export default function Home() {
  const router = useRouter();
  const [modo, setModo] = useState<"inicio" | "crear" | "unirse">("inicio");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function crearSala() {
    if (!nombre.trim()) { setError("Necesitas un nombre"); return; }
    setLoading(true); setError("");
    const nuevoCodigo = generarCodigoSala();
    const { data: sala, error: errSala } = await supabase
      .from("salas").insert({ codigo: nuevoCodigo }).select().single();
    if (errSala || !sala) { setError("No pudimos crear la sala."); setLoading(false); return; }
    const { data: usuario, error: errUsuario } = await supabase
      .from("usuarios").insert({ sala_id: sala.id, nombre: nombre.trim(), es_anfitrion: true })
      .select().single();
    if (errUsuario || !usuario) { setError("Error al unirte."); setLoading(false); return; }
    localStorage.setItem("fep_usuario_id", usuario.id);
    router.push(`/sala/${sala.codigo}`);
  }

  async function unirseSala() {
    if (!nombre.trim()) { setError("Necesitas un nombre"); return; }
    if (!codigo.trim()) { setError("Necesitas el código"); return; }
    setLoading(true); setError("");
    const codigoUpper = codigo.trim().toUpperCase();
    const { data: sala, error: errSala } = await supabase
      .from("salas").select().eq("codigo", codigoUpper).single();
    if (errSala || !sala) { setError("Sala no encontrada"); setLoading(false); return; }
    if (sala.estado !== "esperando") { setError("La sala ya empezó."); setLoading(false); return; }
    const { data: usuario, error: errUsuario } = await supabase
      .from("usuarios").insert({ sala_id: sala.id, nombre: nombre.trim(), es_anfitrion: false })
      .select().single();
    if (errUsuario || !usuario) { setError("Error al unirte."); setLoading(false); return; }
    localStorage.setItem("fep_usuario_id", usuario.id);
    router.push(`/sala/${sala.codigo}`);
  }

  return (
    <>
      <FondoLiquido colors={["#7B2CBF", "#D4145A", "#00E0FF"]} intensity={0.6} />
      <main className="min-h-screen flex flex-col items-center justify-between p-6 pt-16 pb-10 relative">

        <div className="w-full max-w-md flex flex-col items-center gap-2 fade-up">
          <p className="eyebrow">FEP 2026 · Creyentes</p>
          <h1
            className="font-display text-center leading-[0.85] mt-4"
            style={{ fontSize: "clamp(3.5rem, 14vw, 5.5rem)" }}
          >
            INICIACIÓN<br />DE CREYENTES
          </h1>
          <p className="font-body font-light text-center mt-8 max-w-xs leading-relaxed text-white/80 text-base">
            Descubre la identidad sonora que tu grupo ha construido juntx.
          </p>
        </div>

        <div className="w-full max-w-md flex flex-col gap-4 fade-up-delay-2">
          {modo === "inicio" && (
            <>
              <button onClick={() => setModo("crear")} className="btn-primary">
                Crear sala
              </button>
              <button onClick={() => setModo("unirse")} className="btn-ghost">
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
                className="input-ritual"
                autoFocus
              />
              <button onClick={crearSala} disabled={loading} className="btn-primary">
                {loading ? "Creando..." : "Crear sala"}
              </button>
              <button onClick={() => { setModo("inicio"); setError(""); }} className="text-white/60 text-sm py-2 font-body">
                ← Volver
              </button>
            </>
          )}
          {modo === "unirse" && (
            <>
              <input
                type="text" placeholder="Tu nombre" value={nombre}
                onChange={(e) => setNombre(e.target.value)} maxLength={20}
                className="input-ritual" autoFocus
              />
              <input
                type="text" placeholder="Código" value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={4}
                className="input-ritual font-acento text-2xl uppercase tracking-[0.4em] text-center"
              />
              <button onClick={unirseSala} disabled={loading} className="btn-primary">
                {loading ? "Conectando..." : "Unirme"}
              </button>
              <button onClick={() => { setModo("inicio"); setError(""); }} className="text-white/60 text-sm py-2 font-body">
                ← Volver
              </button>
            </>
          )}
          {error && <p className="text-amante text-sm text-center font-body">{error}</p>}
        </div>

        <p className="eyebrow text-center max-w-xs leading-relaxed fade-up-delay-3">
          Solo funciona con dos o más personas
        </p>
      </main>
    </>
  );
}
