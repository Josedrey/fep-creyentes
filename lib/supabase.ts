import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Sala = {
  id: string
  codigo: string
  estado: 'esperando' | 'preguntas' | 'midiendo' | 'resultado'
  pregunta_actual: number
  created_at: string
}

export type VectorArquetipos = {
  Amante: number
  Rebelde: number
  Bufon: number
  Explorador: number
  Mago: number
  Creador: number
}

export type Usuario = {
  id: string
  sala_id: string
  nombre: string
  es_anfitrion: boolean
  vector_arquetipos: VectorArquetipos
  arquetipo_final: string | null
  color: string | null
  tocando: boolean
  created_at: string
}

export function generarCodigoSala(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 4; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)]
  }
  return codigo
}

export const COLORES_ARQUETIPOS: Record<string, string> = {
  Amante: '#D4145A',
  Rebelde: '#FF2D2D',
  Bufon: '#FFD60A',
  Explorador: '#39FF14',
  Mago: '#7B2CBF',
  Creador: '#00E0FF',
}
