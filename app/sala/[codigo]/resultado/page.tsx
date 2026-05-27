"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Usuario, type Sala } from "@/lib/supabase";
import {
  arquetipoDominanteGrupo, mezclarColoresHSL, fraseGrupo,
  nombreDelGrupo, colorDeArquetipo, type Arquetipo,
} from "@/lib/calculo";
import FondoLiquido from "@/components/FondoLiquido";

const claseArquetipo = (arq: Arquetipo): string => {
  const map: Record<Arquetipo, string> = {
    Amante: "arq-amante",
    Rebelde: "arq-rebelde",
    Bufon: "arq-bufon",
    Explorador: "arq-explorador",
    Mago: "arq-mago",
    Creador: "arq-creador",
  };
  return map[arq];
};

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
    if (!usuarioId) { router.push("/"); return; }
    (async () => {
      const { data: salaData, error: errSala } = await supabase
        .from("salas").select().eq("codigo", codigo).single();
      if (errSala || !salaData) { setError("Sala no encontrada"); return; }
      setSala(salaData);
      for (let intento = 0; intento < 5; intento++) {
        const { data: usuariosData } = await supabase
          .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
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
      const { data: usuariosData } = await supabase
        .from("usuarios").select().eq("sala_id", salaData.id).order("created_at");
      if (usuariosData) {
        setUsuarios(usuariosData);
        const yoData = usuariosData.find((u) => u.id === usuarioId);
        if (yoData) setYo(yoData);
      }
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

  if (!sala || !yo || usuarios.length === 0) {
    return (
      <>
        <FondoLiquido />
        <main className="min-h-screen flex items-center justify-center">
          <p className="eyebrow">REVELANDO...</p>
        </main>
      </>
    );
  }

  const vectores = usuarios.map((u) => u.vector_arquetipos);
  const { dominante } = arquetipoDominanteGrupo(vectores);
  const arquetiposIndividuales = usuarios.map((u) => (u.arquetipo_final as Arquetipo) || "Amante");
  const colores = usuarios.map((u) => u.color || colorDeArquetipo((u.arquetipo_final as Arquetipo) || "Amante"));
  const colorGrupal = mezclarColoresHSL(colores);
  const frase = fraseGrupo(arquetiposIndividuales);
  const nombre = nombreDelGrupo(sala.id, dominante);
  const miArquetipo = (yo.arquetipo_final as Arquetipo) || "Amante";
  const miColor = yo.color || colorDeArquetipo(miArquetipo);

  return (
    <>
      <FondoLiquido colors={colores} intensity={0.75} />
      <main className="min-h-screen flex flex-col items-center justify-between p-6 pt-14 pb-8">

        <div className="w-full max-w-md flex flex-col items-center gap-2 text-center fade-up">
          <p className="eyebrow">Lo que sostuvieron juntxs reveló esto</p>
          <h1
            className={`${claseArquetipo(dominante)} leading-[0.9] mt-3`}
            style={{
              fontSize: "clamp(2.5rem, 11vw, 4.5rem)",
              color: colorGrupal,
              textShadow: `0 0 60px ${colorGrupal}80`,
            }}
          >
            {nombre}
          </h1>
          <p className="font-body font-light text-base text-white/85 mt-6 max-w-xs leading-relaxed">
            {frase}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-md fade-up-delay-1">
          <p className="eyebrow">Su frecuencia dominante</p>
          <p
            className={`${claseArquetipo(dominante)} text-3xl`}
            style={{ color: colorGrupal }}
          >
            {dominante}
          </p>
          <div className="w-full max-w-xs flex h-3 rounded-full overflow-hidden border border-white/20 mt-2">
            {usuarios.map((u) => (
              <div key={u.id} className="flex-1 transition-all" style={{ backgroundColor: u.color || "#fff" }} title={u.nombre} />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {usuarios.map((u) => (
              <div key={u.id} className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-body border border-white/10">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color || "#fff" }} />
                <span>{u.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md flex flex-col gap-3 fade-up-delay-2">
          {mostrarPersonal ? (
            <div className="bg-black/40 backdrop-blur-md border border-white/15 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Tu lugar en el grupo</p>
                <button onClick={() => setMostrarPersonal(false)} className="text-white/50 text-xs font-body">
                  Ocultar
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: miColor, boxShadow: `0 0 30px ${miColor}80` }} />
                <div>
                  <p className={`${claseArquetipo(miArquetipo)} text-3xl`} style={{ color: miColor }}>
                    {miArquetipo}
                  </p>
                  <p className="text-xs text-white/60 font-body font-light">
                    Tu frecuencia dentro de {nombre}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setMostrarPersonal(true)} className="w-full text-center text-white/60 text-sm py-2 underline underline-offset-4 font-body">
              Ver mi lugar en el grupo
            </button>
          )}

          <button onClick={() => router.push(`/sala/${codigo}/recorrido`)} className="btn-primary w-full">
            Su recorrido en el FEP →
          </button>
        </div>
      </main>
    </>
  );
}
