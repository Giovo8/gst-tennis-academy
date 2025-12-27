"use client";

import { useState } from "react";
import { ImagePlus, Newspaper } from "lucide-react";

type NewsPost = {
  id: string;
  title: string;
  image: string;
  body: string;
};

const initialPosts: NewsPost[] = [
  {
    id: "n1",
    title: "Stage intensivo pre-torneo",
    image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80",
    body: "Settimana di match play, video analysis e preparazione atletica per il calendario invernale.",
  },
  {
    id: "n2",
    title: "Nuove divise team GST",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    body: "Disponibili le nuove divise ufficiali per team agonistico e junior academy.",
  },
];

export default function AdminNewsBoard() {
  const [posts, setPosts] = useState<NewsPost[]>(initialPosts);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPost = () => {
    if (!title || !body) {
      setError("Titolo e testo sono obbligatori.");
      return;
    }
    setError(null);
    setPosts((prev) => [
      {
        id: `n-${Date.now()}`,
        title,
        image:
          image ||
          "https://images.unsplash.com/photo-1546512565-39d4dc78b9d8?auto=format&fit=crop&w=800&q=80",
        body,
      },
      ...prev,
    ]);
    setTitle("");
    setImage("");
    setBody("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Newspaper className="h-4 w-4 text-accent" />
          Pubblica un annuncio
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-accent" />
            <input
              className="w-full rounded-xl border border-white/15 bg-[#1a3d5c]/60 px-3 py-2 text-sm text-white outline-none focus-ring-accent"
              placeholder="URL immagine (opzionale)"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <textarea
            className="sm:col-span-2 min-h-[120px] rounded-xl border border-white/15 bg-[#1a3d5c]/60 px-3 py-2 text-sm text-white outline-none focus-ring-accent"
            placeholder="Testo del post"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && (
          <p className="mt-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        )}
        <div className="mt-3">
          <button
            onClick={addPost}
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-[#06101f] shadow-accent transition hover:-translate-y-0.5 accent-gradient"
          >
            Pubblica
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
            <div
              className="h-40 w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${post.image})` }}
            />
            <div className="space-y-2 p-4">
              <h3 className="text-lg font-semibold text-white">{post.title}</h3>
              <p className="text-sm text-muted">{post.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}


