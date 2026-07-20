"use client";

import { useEffect, useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Todo = { id: string; content: string; done: boolean };

/**
 * Lista personale "da fare", non legata a una data.
 * Dati in personal_todos (RLS owner-only).
 */
export default function TodoListCard({ userId }: { userId?: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("personal_todos")
        .select("id, content, done")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setTodos((data as Todo[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function addTodo() {
    const text = newText.trim();
    if (!text || !userId) return;
    setNewText("");
    const { data } = await supabase
      .from("personal_todos")
      .insert({ user_id: userId, content: text })
      .select("id, content, done")
      .single();
    if (data) setTodos((prev) => [data as Todo, ...prev]);
  }

  async function toggleTodo(todo: Todo) {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
    await supabase.from("personal_todos").update({ done: !todo.done }).eq("id", todo.id);
  }

  async function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("personal_todos").delete().eq("id", id);
  }

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="page-card h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Da fare</h2>
        {todos.length > 0 && (
          <span className="text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-2.5 py-0.5">
            {doneCount} di {todos.length} fatte
          </span>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addTodo();
            }}
            placeholder="Aggiungi qualcosa da fare…"
            disabled={!userId}
            className="flex-1 min-w-0 h-11 rounded-lg border border-black/10 bg-white px-4 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/20"
          />
          <button
            type="button"
            onClick={() => void addTodo()}
            disabled={!newText.trim()}
            aria-label="Aggiungi"
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg bg-secondary text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="h-6 w-6 rounded-full border-2 border-secondary/20 border-t-secondary animate-spin" />
          </div>
        ) : todos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-secondary/40">
            <ListTodo className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Nessuna cosa da fare</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: "260px" }}>
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-3.5 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => void toggleTodo(todo)}
                  aria-label={todo.done ? "Segna come da fare" : "Segna come fatta"}
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 flex-shrink-0 transition-colors ${
                    todo.done ? "border-secondary bg-secondary" : "border-secondary bg-white hover:bg-secondary/10"
                  }`}
                >
                  {todo.done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </button>
                <span
                  className={`flex-1 min-w-0 text-sm break-words ${
                    todo.done ? "text-secondary/40 line-through" : "text-secondary"
                  }`}
                >
                  {todo.content}
                </span>
                <button
                  type="button"
                  onClick={() => void removeTodo(todo.id)}
                  aria-label="Elimina"
                  className="text-secondary/30 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
