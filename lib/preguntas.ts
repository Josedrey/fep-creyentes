import { VectorArquetipos } from "./supabase";

export type Opcion = {
  texto: string;
  puntos: Partial<Record<keyof VectorArquetipos, number>>;
};

export type Pregunta = {
  id: number;
  texto: string;
  opciones: Opcion[];
};

export const PREGUNTAS: Pregunta[] = [
  {
    id: 0,
    texto: "¿Qué papel tiene la música en tu vida?",
    opciones: [
      { texto: "Es el soundtrack que me hace épicx", puntos: { Amante: 2, Creador: 1 } },
      { texto: "Es mi motor de descubrimiento constante", puntos: { Explorador: 2, Mago: 1 } },
      { texto: "Es mi escape de la realidad", puntos: { Rebelde: 2, Amante: 1 } },
      { texto: "Es mi lenguaje, así me expreso", puntos: { Creador: 2, Mago: 1 } },
    ],
  },
  {
    id: 1,
    texto: "Cuando escuchas a tu artista favoritx, ¿qué sientes?",
    opciones: [
      { texto: "Energía que tengo que sacar del cuerpo", puntos: { Rebelde: 2, Bufon: 1 } },
      { texto: "Melancolía profunda, casi placentera", puntos: { Amante: 2, Creador: 1 } },
      { texto: "Ganas de bailar con lo que sea", puntos: { Bufon: 2, Rebelde: 1 } },
      { texto: "Conexión con algo más grande que yo", puntos: { Mago: 2, Amante: 1 } },
    ],
  },
  {
    id: 2,
    texto: "Solo unx headliner del FEP 2026. ¿Cuál?",
    opciones: [
      { texto: "Tyler, the Creator", puntos: { Creador: 2, Rebelde: 1 } },
      { texto: "Peso Pluma", puntos: { Bufon: 2, Rebelde: 1 } },
      { texto: "Djo", puntos: { Amante: 2, Mago: 1 } },
      { texto: "KATSEYE", puntos: { Bufon: 2, Explorador: 1 } },
      { texto: "Ana Tijoux", puntos: { Mago: 2, Creador: 1 } },
    ],
  },
  {
    id: 3,
    texto: "Con tu grupo, ¿cómo se vive la música?",
    opciones: [
      { texto: "Cada unx por su lado pero conectados", puntos: { Explorador: 2, Creador: 1 } },
      { texto: "Es nuestro idioma propio, en código", puntos: { Mago: 2, Amante: 1 } },
      { texto: "Es la excusa para todo lo demás", puntos: { Bufon: 2, Rebelde: 1 } },
      { texto: "Es el latido común, lo sentimos juntxs", puntos: { Amante: 2, Bufon: 1 } },
    ],
  },
  {
    id: 4,
    texto: "Suena tu canción favorita en una tarima. ¿Qué haces?",
    opciones: [
      { texto: "Lloro como si nadie viera", puntos: { Amante: 2, Mago: 1 } },
      { texto: "Salto, grito, choco con quien tenga al lado", puntos: { Rebelde: 2, Bufon: 1 } },
      { texto: "La uso como banda sonora de mi propio momento", puntos: { Creador: 2, Explorador: 1 } },
      { texto: "Corro a buscar a mis amigxs para vivirla juntxs", puntos: { Explorador: 2, Bufon: 1 } },
    ],
  },
];
