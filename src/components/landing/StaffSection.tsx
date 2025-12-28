"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, User } from "lucide-react";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  image_url: string | null;
};

const defaultStaff: StaffMember[] = [
  {
    id: "default-1",
    full_name: "Giulia Serra",
    role: "Head Coach FITP 3° grado",
    bio: "Specialista tecnica e costruzione pattern di gioco.",
    image_url: null,
  },
  {
    id: "default-2",
    full_name: "Luca Bernardi",
    role: "Preparatore atletico",
    bio: "Condizionamento, forza e prevenzione infortuni.",
    image_url: null,
  },
  {
    id: "default-3",
    full_name: "Marta Riva",
    role: "Mental coach",
    bio: "Gestione pressione, routine pre-gara e focus in match.",
    image_url: null,
  },
];

export default function StaffSection() {
  const [staff, setStaff] = useState<StaffMember[]>(defaultStaff);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("active", true)
      .order("order_index", { ascending: true });

    if (error) {
      // Use default staff on error
      setStaff(defaultStaff);
    } else if (data && data.length > 0) {
      setStaff(data);
    } else {
      setStaff(defaultStaff);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <section id="staff" className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </section>
    );
  }

  return (
    <section id="staff">
      <div className="section-header">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
          Il nostro staff
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Incontra il team
        </h2>
      </div>

      <div className="grid gap-lg md:grid-cols-3">
        {staff.map((member) => (
          <article key={member.id} className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 overflow-hidden">
            {member.image_url ? (
              <img
                src={member.image_url}
                alt={member.full_name}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-[#0d1b2a] flex items-center justify-center">
                <User className="h-20 w-20 text-muted-2" />
              </div>
            )}
            <div className="p-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{member.full_name}</h3>
                <span className="inline-block mt-2 rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold text-accent">
                  {member.role}
                </span>
              </div>
              {member.bio && (
                <p className="text-sm leading-relaxed text-muted">
                  {member.bio}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

