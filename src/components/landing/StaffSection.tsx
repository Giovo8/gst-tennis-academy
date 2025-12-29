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
    <section id="staff" className="max-w-7xl mx-auto px-6 py-20">
      <div className="space-y-12">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent mb-3 text-center">
            Il nostro staff
          </p>
          <h2 className="text-5xl font-bold gradient-text mb-4">
            I nostri professionisti
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Un team di esperti dedicato al tuo miglioramento
          </p>

        </div>

        <div className="grid gap-5 md:grid-cols-3">
        {staff.map((member) => (
          <article key={member.id} className="group rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-mid/10 to-transparent backdrop-blur-xl overflow-hidden hover:border-[var(--glass-border)] hover:border-opacity-70 hover:shadow-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300">
            {member.image_url ? (
              <img
                src={member.image_url}
                alt={member.full_name}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gradient-to-br from-accent-dark/30 to-gray-900/50 flex items-center justify-center group-hover:from-accent-dark/40 transition-all">
                <User className="h-20 w-20 text-accent/60 group-hover:text-accent transition-colors" />
              </div>
            )}
            <div className="p-6 space-y-3">
              <div>
                <h3 className="text-xl font-bold gradient-text">{member.full_name}</h3>
                <span className="inline-block mt-2 rounded-full bg-accent-20 px-3 py-1 text-xs font-bold text-accent border border-[var(--glass-border)]">
                  {member.role}
                </span>
              </div>
              {member.bio && (
                <p className="text-sm leading-relaxed text-gray-300">
                  {member.bio}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}

