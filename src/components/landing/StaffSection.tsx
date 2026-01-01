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
    <section id="staff" className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16 md:py-20">
      <div className="space-y-10 sm:space-y-12">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-accent mb-4 text-center">
            Il nostro staff
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-4">
            I nostri professionisti
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Un team di esperti dedicato al tuo miglioramento
          </p>

        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <article key={member.id} className="group rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl overflow-hidden hover:border-white/40 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
            {member.image_url ? (
              <img
                src={member.image_url}
                alt={member.full_name}
                className="w-full h-48 sm:h-56 md:h-64 object-cover"
              />
            ) : (
              <div className="w-full h-48 sm:h-56 md:h-64 bg-gradient-to-br from-cyan-900/30 to-blue-900/50 flex items-center justify-center group-hover:from-cyan-900/40 transition-all">
                <User className="h-16 w-16 sm:h-20 sm:w-20 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
              </div>
            )}
            <div className="p-5 sm:p-6 md:p-7 space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold gradient-text">{member.full_name}</h3>
                <span className="inline-block mt-2 sm:mt-2.5 rounded-full bg-cyan-500/20 border-2 border-cyan-400/40 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-bold text-cyan-300">
                  {member.role}
                </span>
              </div>
              {member.bio && (
                <p className="text-sm sm:text-base leading-relaxed text-gray-300">
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

