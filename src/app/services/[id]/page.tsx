import { supabaseServer } from "@/lib/supabase/serverClient";
import { notFound } from "next/navigation";

type Props = { params: { id: string } };

export default async function ServicePage({ params }: Props) {
  const id = params.id;
  const { data, error } = await supabaseServer.from("services").select("*").eq("id", id).single();
  if (error || !data) return notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-white">{data.title}</h1>
      <p className="mt-2 text-[#c6d8c9]">{data.description}</p>
      <p className="mt-2 text-accent font-semibold">Prezzo: €{data.price}</p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          const start_at = formData.get("start_at");
          const end_at = formData.get("end_at");
          const profile_id = formData.get("profile_id");

          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service_id: id, profile_id, start_at, end_at }),
          });
          if (res.ok) alert("Prenotazione creata");
          else {
            const json = await res.json();
            alert("Errore: " + (json?.error || res.status));
          }
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="block text-sm text-[#c6d8c9]">Profilo ID</label>
          <input name="profile_id" required className="w-full mt-1 p-2 rounded bg-frozen-900 text-white" />
        </div>
        <div>
          <label className="block text-sm text-[#c6d8c9]">Data e ora inizio</label>
          <input name="start_at" type="datetime-local" required className="w-full mt-1 p-2 rounded bg-frozen-900 text-white" />
        </div>
        <div>
          <label className="block text-sm text-[#c6d8c9]">Data e ora fine</label>
          <input name="end_at" type="datetime-local" required className="w-full mt-1 p-2 rounded bg-frozen-900 text-white" />
        </div>
        <div>
          <button className="btn btn-primary" type="submit">Prenota</button>
        </div>
      </form>
    </div>
  );
}
