"use client";

import { useState } from "react";
import Image from "next/image";

// Cada parada lleva una posición % (x, y) sobre la imagen del mapa
export type ParadaMapa = {
  tarima: string;
  razon: string;
  x: number; // 0-100, % desde la izquierda
  y: number; // 0-100, % desde arriba
};

type Props = {
  paradas: ParadaMapa[];
  colorAcento?: string;
  rutaImagen?: string; // por defecto /mapa-fep.jpg
};

export default function MapaFEP({
  paradas,
  colorAcento = "#FFFFFF",
  rutaImagen = "/mapa-fep.jpg",
}: Props) {
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="relative w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10">
        {/* Mapa */}
        <Image
          src={rutaImagen}
          alt="Mapa del Festival Estéreo Picnic"
          width={800}
          height={800}
          className="w-full h-auto object-contain"
          priority
        />

        {/* Puntos clicables sobre la imagen */}
        {paradas.map((parada, idx) => {
          const esSeleccionada = seleccionada === idx;
          return (
            <button
              key={idx}
              onClick={() => setSeleccionada(esSeleccionada ? null : idx)}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform"
              style={{ left: `${parada.x}%`, top: `${parada.y}%` }}
              aria-label={`Parada ${idx + 1}: ${parada.tarima}`}
            >
              {/* Anillo de pulso */}
              <span
                className="absolute inset-0 rounded-full pulse-glow"
                style={{
                  background: colorAcento,
                  opacity: 0.4,
                  filter: "blur(8px)",
                  transform: "scale(1.6)",
                }}
              />
              {/* Punto */}
              <span
                className="relative flex items-center justify-center font-acento text-base shadow-lg transition-all"
                style={{
                  width: esSeleccionada ? "44px" : "36px",
                  height: esSeleccionada ? "44px" : "36px",
                  borderRadius: "9999px",
                  backgroundColor: colorAcento,
                  color: "#000",
                  border: `3px solid #fff`,
                }}
              >
                {idx + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalle de la parada seleccionada */}
      {seleccionada !== null && paradas[seleccionada] && (
        <div
          className="bg-white/8 backdrop-blur-md border rounded-2xl p-4 flex gap-4 fade-up"
          style={{ borderColor: `${colorAcento}50` }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-acento text-base flex-shrink-0"
            style={{ backgroundColor: colorAcento, color: "#000" }}
          >
            {seleccionada + 1}
          </div>
          <div className="flex-1">
            <p className="font-parada text-2xl leading-tight">
              {paradas[seleccionada].tarima}
            </p>
            <p className="font-body font-light text-sm text-white/75 leading-snug mt-1">
              {paradas[seleccionada].razon}
            </p>
          </div>
        </div>
      )}

      {seleccionada === null && (
        <p className="font-meta text-xs text-white/50 text-center mt-1">
          Toca un número para ver detalles
        </p>
      )}
    </div>
  );
}
