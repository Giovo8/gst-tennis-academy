export type AiNewsStato = "bozza" | "pubblicata" | "scartata";

export type AiNewsDraft = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  created_at: string;
  stato: AiNewsStato;
  ai_generated: boolean;
  fonte_nome: string | null;
  fonte_url: string | null;
};

export type AiNewsConfig = {
  id: string;
  pubblicazione_auto: boolean;
  aggiornato_a: string;
  aggiornato_da: string | null;
};

export type AiNewsFonte = {
  id: string;
  nome: string;
  url: string;
  categoria: string | null;
  attiva: boolean;
  creato_a: string;
};

export type AiNewsCron = {
  id: string;
  nome: string;
  ora: number;
  minuto: number;
  categoria: string | null;
  prompt_custom: string | null;
  attivo: boolean;
  ultimo_eseguito: string | null;
  creato_a: string;
};
