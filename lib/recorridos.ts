import type { Arquetipo } from "./calculo";

export type Recorrido = {
  manifiesto: string;
  paradas: { tarima: string; razon: string }[];
  ritual: string;
  consejo: string;
};

// Tarimas reales del FEP usadas como referencia (Adidas, Johnnie Walker, Budweiser, Corona Sunsets, Anonymous Music).
// El recorrido es ficción narrativa, no agenda oficial.
export const RECORRIDOS: Record<Arquetipo, Recorrido> = {
  Amante: {
    manifiesto:
      "Vienen a sentir, no a coleccionar. Su recorrido es lento, profundo, casi privado.",
    paradas: [
      {
        tarima: "Adidas",
        razon: "Llegada temprana al acto principal. Sin afán de moverse.",
      },
      {
        tarima: "Johnnie Walker",
        razon: "Para los sets con peso emocional. Ahí lloran sin pena.",
      },
      {
        tarima: "Corona Sunsets",
        razon: "Atardecer compartido. La hora exacta para el set más íntimo del día.",
      },
    ],
    ritual:
      "Antes de la última canción de la noche, todxs cierran los ojos un minuto. Lo que sientan ahí, no se cuenta.",
    consejo:
      "No corran de un set a otro. Quédense en uno completo, hasta la última nota.",
  },
  Rebelde: {
    manifiesto:
      "Ustedes no vinieron a posar. Su recorrido es ruido, sudor, y cuerpos que se chocan en buena lid.",
    paradas: [
      {
        tarima: "Budweiser",
        razon: "Lo más fuerte del lineup. Aquí empieza la noche.",
      },
      {
        tarima: "Adidas",
        razon: "El acto principal cuando ya están sin voz pero con energía intacta.",
      },
      {
        tarima: "Anonymous Music",
        razon: "Para cerrar. La música electrónica que aún no conocen pero que les pertenece.",
      },
    ],
    ritual:
      "En el set más intenso del día, busquen el centro del mosh y conéctense por los hombros. No se suelten.",
    consejo:
      "Hidrátense. Lo que ustedes hacen no se sostiene sin agua.",
  },
  Bufon: {
    manifiesto:
      "Ustedes son la celebración misma. El recorrido importa menos que el bailoteo que dejen en el camino.",
    paradas: [
      {
        tarima: "Corona Sunsets",
        razon: "Llegada temprana, cerveza fría, calentamiento social.",
      },
      {
        tarima: "Adidas",
        razon: "El show grande. Donde bailan con desconocidos como si fueran de la familia.",
      },
      {
        tarima: "Johnnie Walker",
        razon: "Cierre de noche. Aquí termina lo que empezó hace doce horas.",
      },
    ],
    ritual:
      "Cada vez que se separen del grupo, vuelvan con una historia. La cantidad de historias define el día.",
    consejo:
      "No planeen tanto. Lo bueno les va a pasar mientras buscaban otra cosa.",
  },
  Explorador: {
    manifiesto:
      "Ustedes están aquí por lo que no conocen todavía. Su mapa es la curiosidad.",
    paradas: [
      {
        tarima: "Anonymous Music",
        razon: "Empezar por lo desconocido. La banda que les va a cambiar el año.",
      },
      {
        tarima: "Johnnie Walker",
        razon: "Set intermedio, género que normalmente no oyen. Pruébenlo entero.",
      },
      {
        tarima: "Budweiser",
        razon: "Cierre potente pero solo media hora. Después vuelvan a explorar.",
      },
    ],
    ritual:
      "Cada hora, uno del grupo escoge una tarima al azar. Los demás siguen. Sin quejas.",
    consejo:
      "El mapa no es la agenda. Si están perdidxs, están haciendo bien.",
  },
  Mago: {
    manifiesto:
      "Ustedes leen lo que otrxs no ven. Su recorrido tiene una lógica que solo entienden ustedes.",
    paradas: [
      {
        tarima: "Anonymous Music",
        razon: "Set de apertura. Aquí se sintoniza el cuerpo con el resto del día.",
      },
      {
        tarima: "Johnnie Walker",
        razon: "Para el momento más denso del lineup. Vayan listxs.",
      },
      {
        tarima: "Corona Sunsets",
        razon: "Atardecer. La hora bisagra. Aquí se decide cómo termina la noche.",
      },
    ],
    ritual:
      "Antes de cada tarima, diez segundos en silencio. Lo que sientan ahí marca cómo entran.",
    consejo:
      "Confíen en su orden. Las multitudes van a otro lado por una razón distinta a la suya.",
  },
  Creador: {
    manifiesto:
      "Ustedes están aquí para que algo se les quede pegado y salga después. El festival es materia prima.",
    paradas: [
      {
        tarima: "Adidas",
        razon: "El acto que ya conocen pero quieren ver en vivo. Refrencia obligada.",
      },
      {
        tarima: "Anonymous Music",
        razon: "Para encontrar texturas y sonidos que no tenían en su biblioteca.",
      },
      {
        tarima: "Corona Sunsets",
        razon: "Set tranquilo donde puedan tomar notas. Mentales o reales, da igual.",
      },
    ],
    ritual:
      "Al final de la noche, cada unx graba un audio de 30 segundos contando lo que se llevan. Lo escuchan en una semana.",
    consejo:
      "No traten de capturarlo todo. Lo que se les quede, ya está.",
  },
};
