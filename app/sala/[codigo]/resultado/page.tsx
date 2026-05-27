"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Usuario, type Sala } from "@/lib/supabase";
import {
  arquetipoDominanteGrupo,
  mezclarColoresHSL,
  fraseGrupo,
  nombreDelGrupo,
  colorDeArquetipo,
  type Arquetipo,
} from "@/lib/calculo";

export default function Resultado() {
  const params = useParams();
  const router = useRouter();
  const codigo = (params.codigo as string).toUpperCase();

  const [sala, setSala] = useState<Sala | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [yo, setYo] = useState<Usuario | null>(null);
  const [mostrarPersonal, setMostrarPersonal] = useState(false);
  const [error, setError] = useState("");

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

      // Espera corta y reintenta si algún usuario aún no tiene arquetipo guardado
      for (let intento = 0; intento < 5; intento++) {
        const { data: usuariosData } = await supabase
          .from("usuarios")
          .select()
          .eq("sala_id", salaData.id)
          .order("created_at");
        if (!usuariosData) break;
        const todosListos = usuariosData.every((u) => u.arquetipo_final);
        if (todosListos) {
          setUsuarios(usuariosData);
          const yoData = usuariosData.find((u) => u.id === usuarioId);
          if (yoData) setYo(yoData);
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      // Fallback: leer lo que haya
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

  if (!sala || !yo || usuarios.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/60 text-sm tracking-[0.2em]">REVELANDO...</p>
      </main>
    );
  }

  // === Cálculos ===
  const vectores = usuarios.map((u) => u.vector_arquetipos);
  const { dominante } = arquetipoDominanteGrupo(vectores);
  const arquetiposIndividuales = usuarios.map((u) =>
    (u.arquetipo_final as Arquetipo) || "Amante"
  );
  const colores = usuarios.map((u) => u.color || colorDeArquetipo((u.arquetipo_final as Arquetipo) || "Amante"));
  const colorGrupal = mezclarColoresHSL(colores);
  const frase = fraseGrupo(arquetiposIndividuales);
  const nombre = nombreDelGrupo(sala.id, dominante);

  const miArquetipo = (yo.arquetipo_final as Arquetipo) || "Amante";
  const miColor = yo.color || colorDeArquetipo(miArquetipo);

  // Background gradiente animado con los colores de los miembros
  const gradientStops = colores
    .map((c, i) => `${c} ${(i * 100) / Math.max(1, colores.length - 1)}%`)
    .join(", ");

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background animado: gradiente con los colores de los miembros */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `linear-gradient(135deg, ${gradientStops})`,
          filter: "blur(60px)",
          animation: "shift 8s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${colorGrupal}, transparent 60%)`,
          filter: "blur(40px)",
          animation: "shift 12s ease-in-out infinite alternate-reverse",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <style>{`
        @keyframes shift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-5%, 5%) scale(1.15); }
        }
      `}</style>

      {/* Contenido */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between p-6 pt-16 pb-8">
        {/* Encabezado */}
        <div className="w-full max-w-md flex flex-col items-center gap-2 text-center">
          <p className="text-xs tracking-[0.3em] text-white/70">SU IDENTIDAD GRUPAL</p>
          <h1 className="text-5xl font-bold leading-[0.95] mt-3" style={{ color: colorGrupal }}>
            {nombre}
          </h1>
          <p className="text-sm text-white/80 mt-6 max-w-xs leading-relaxed">
            {frase}
          </p>
        </div>

        {/* Resumen central */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <p className="text-xs tracking-[0.3em] text-white/60">SU FRECUENCIA DOMINANTE</p>
          <p className="text-2xl font-bold uppercase tracking-wider" style={{ color: colorGrupal }}>
            {dominante}
          </p>
          {/* Barra de miembros con sus colores */}
          <div className="w-full max-w-xs flex h-3 rounded-full overflow-hidden border border-white/20 mt-2">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="flex-1"
                style={{ backgroundColor: u.color || "#ffffff" }}
                title={u.nombre}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs border border-white/10"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: u.color || "#fff" }}
                />
                <span>{u.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sección personal colapsable + botón continuar */}
        <div className="w-full max-w-md flex flex-col gap-3">
          {mostrarPersonal ? (
            <div className="bg-black/40 backdrop-blur-md border border-white/15 rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.3em] text-white/60">TU LUGAR EN EL GRUPO</p>
                <button
                  onClick={() => setMostrarPersonal(false)}
                  className="text-white/50 text-xs"
                >
                  Ocultar
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: miColor }}
                />
                <div>
                  <p className="text-2xl font-bold uppercase" style={{ color: miColor }}>
                    {miArquetipo}
                  </p>
                  <p className="text-xs text-white/60">Tu frecuencia dentro de {nombre}</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setMostrarPersonal(true)}
              className="w-full text-center text-white/60 text-sm py-2 underline underline-offset-4"
            >
              Ver mi lugar en el grupo
            </button>
          )}

          <button
            onClick={() => router.push(`/sala/${codigo}/recorrido`)}
            className="w-full bg-white text-black font-semibold py-4 rounded-full text-lg active:scale-95 transition"
          >
            Su recorrido en el FEP →
          </button>
        </div>
      </div>
    </main>
  );
}
