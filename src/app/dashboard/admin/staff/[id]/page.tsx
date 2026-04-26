"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  image_url: string | null;
  order_index: number | null;
  active: boolean;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
};

export default function AdminStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (!staffId) return;
    loadStaffDetail();
  }, [staffId]);

  async function loadStaffDetail() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", staffId)
        .single();

      if (error) throw error;
      setStaff(data as StaffMember);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!staff) return;
    if (!confirm(`Sei sicuro di voler eliminare "${staff.full_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("staff").delete().eq("id", staff.id);
      if (error) throw error;
      router.push("/dashboard/admin/staff");
    } catch {
      alert("Errore durante l'eliminazione del membro staff");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento membro staff...</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-secondary">Dettaglio Staff</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-secondary/70">Membro staff non trovato.</p>
          <Link
            href="/dashboard/admin/staff"
            className="inline-flex mt-4 px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all"
          >
            Torna alla lista
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = [
    { label: "Facebook", url: staff.facebook_url },
    { label: "Instagram", url: staff.instagram_url },
    { label: "LinkedIn", url: staff.linkedin_url },
    { label: "Twitter", url: staff.twitter_url },
  ].filter((item) => Boolean(item.url));

  return (
    <div className="space-y-6">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/staff" className="hover:text-secondary/80 transition-colors">
            Staff
          </Link>
          {" › "}
          <span>Dettaglio</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettaglio Staff</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 pb-6 border-b border-gray-200 md:border-b-0">
            <label className="text-sm font-semibold text-secondary">Immagine</label>
            <div className="w-full">
              {staff.image_url ? (
                <img
                  src={staff.image_url}
                  alt={staff.full_name}
                  className="w-full h-72 sm:h-[30rem] lg:h-[34rem] rounded-lg object-contain object-left bg-secondary/5 border border-gray-200 md:border-0"
                />
              ) : (
                <div className="w-full h-72 sm:h-[30rem] lg:h-[34rem] rounded-lg bg-secondary/10 border border-gray-200 md:border-0 flex items-center justify-center">
                  <span className="font-bold text-4xl text-secondary">{staff.full_name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="text-sm font-semibold text-secondary sm:w-48 flex-shrink-0">Nome</label>
            <div className="font-semibold text-secondary">{staff.full_name}</div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="text-sm font-semibold text-secondary sm:w-48 flex-shrink-0">Ruolo</label>
            <div className="font-semibold text-secondary">{staff.role}</div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="text-sm font-semibold text-secondary sm:w-48 flex-shrink-0">Ordine</label>
            <div className="font-semibold text-secondary">{staff.order_index && staff.order_index > 0 ? staff.order_index : "Non impostato"}</div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="text-sm font-semibold text-secondary sm:w-48 flex-shrink-0">Stato</label>
            <div className={staff.active ? "font-semibold text-secondary" : "font-semibold text-gray-500"}>
              {staff.active ? "Attivo" : "Disattivo"}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
            <label className="text-sm font-semibold text-secondary sm:w-48 sm:pt-1 flex-shrink-0">Bio</label>
            <div className="text-secondary/80 whitespace-pre-wrap">{staff.bio || "Nessuna biografia"}</div>
          </div>

          {socialLinks.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              {socialLinks.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 ${
                    index < socialLinks.length - 1 ? "pb-6 mb-6 border-b border-gray-200" : ""
                  }`}
                >
                  <label className="text-sm font-semibold text-secondary sm:w-48 flex-shrink-0">{item.label}</label>
                  <a
                    href={item.url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-secondary hover:opacity-80 transition-opacity break-all"
                  >
                    {item.url}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
        >
          Elimina
        </button>
        <Link
          href={`/dashboard/admin/staff/new?id=${staff.id}`}
          className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-all"
        >
          Modifica
        </Link>
      </div>
    </div>
  );
}
