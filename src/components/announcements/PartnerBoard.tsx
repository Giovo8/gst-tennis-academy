"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type PartnerPost = {
  id: string;
  name: string;
  level: string;
  availability: string;
  note: string;
};

const initialPosts: PartnerPost[] = [
  {
    id: "p1",
    name: "Luca B.",
    level: "4.1 FITP",
    availability: "Lun/Mer sera",
    note: "Cerco compagno per allenamento match-play, zona Milano.",
  },
  {
    id: "p2",
    name: "Giulia R.",
    level: "3.5",
    availability: "Sabato mattina",
    note: "Preferisco terra rossa, sessioni di palleggio e punti.",
  },
];

export default function PartnerBoard() {
  const [posts, setPosts] = useState<PartnerPost[]>(initialPosts);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [availability, setAvailability] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const publish = () => {
    if (!name || !level || !availability) {
      setError("Nome, livello e disponibilità sono obbligatori.");
      return;
    }
    setError(null);
    setPosts((prev) => [
      {
        id: `pb-${Date.now()}`,
        name,
        level,
        availability,
        note,
      },
      ...prev,
    ]);
    setName("");
    setLevel("");
    setAvailability("");
    setNote("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4 text-accent" />
          Crea annuncio &quot;Cerco socio&quot;
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Livello (es. 4.1 FITP)"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Disponibilità (es. Lun/Mer sera)"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          />
          <textarea
            className="sm:col-span-2 min-h-[100px] rounded-xl border border-white/15 bg-[#1a3d5c]/60 px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Note (opzionale)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && (
          <p className="mt-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        )}
        <div className="mt-3">
          <button
            onClick={publish}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-[#06101f] shadow-accent transition hover:-translate-y-0.5 accent-gradient"
          >
            <Send className="h-4 w-4" />
            Pubblica
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{post.name}</p>
                <p className="text-xs text-muted-2">{post.level}</p>
              </div>
              <span className="rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold text-accent">
                Disponibilità
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{post.availability}</p>
            {post.note && <p className="mt-1 text-xs text-muted-2">{post.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

