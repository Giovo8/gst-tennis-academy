"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, User, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  bio: string;
  image_url: string | null;
  order_index: number;
  active: boolean;
};

export default function AdminStaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  // Filter staff based on search query
  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.bio && member.bio.toLowerCase().includes(query))
    );
  });

  // Ordine identico alla home: order_index ascending
  const sortedStaff = filteredStaff.slice().sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Gestione Staff</p>
        <h1 className="text-4xl font-bold text-secondary">Gestione Staff</h1>
      </div>

      <div className="w-full">
        <Link
          href="/dashboard/admin/staff/new"
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Membro</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome, ruolo o biografia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
        />
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento staff...</p>
        </div>
      ) : sortedStaff.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <User className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {searchQuery ? "Nessun risultato trovato" : "Nessun membro dello staff"}
          </h3>
          <p className="text-secondary/60">
            {searchQuery ? "Prova a modificare la ricerca" : "Inizia aggiungendo il primo membro dello staff"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedStaff.map((member) => {
            const cardBg = member.active ? "var(--secondary)" : "#9ca3af";

            return (
              <div
                key={member.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => router.push(`/dashboard/admin/staff/${member.id}`)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white leading-none">
                        {member.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">{member.role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}