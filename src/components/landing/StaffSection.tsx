"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Linkedin, Twitter, Dribbble } from "lucide-react";
import Link from "next/link";

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
    full_name: "Marco Rossi",
    role: "Maestro FIT",
    bio: "Specializzato in tecnica e tattica. Lavora con giocatori di ogni livello da quindici anni.",
    image_url: null,
  },
  {
    id: "default-2",
    full_name: "Giulia Bianchi",
    role: "Istruttrice PTR",
    bio: "Dedita alla formazione dei giovani talenti. Ha preparato campioni regionali e nazionali.",
    image_url: null,
  },
  {
    id: "default-3",
    full_name: "Andrea Moretti",
    role: "Maestro FIT",
    bio: "Esperto di doppio e preparazione atletica. Segue i giocatori agonisti del club.",
    image_url: null,
  },
  {
    id: "default-4",
    full_name: "Francesca Gallo",
    role: "Istruttrice PTR",
    bio: "Appassionata di tennis per bambini. Crea programmi ludici che sviluppano passione e tecnica.",
    image_url: null,
  },
  {
    id: "default-5",
    full_name: "Luca Ferrari",
    role: "Maestro FIT",
    bio: "Specializzato in recupero e prevenzione infortuni. Collabora con fisioterapisti del club.",
    image_url: null,
  },
  {
    id: "default-6",
    full_name: "Valentina Conti",
    role: "Istruttrice PTR",
    bio: "Insegna tennis a tutte le età. Crede che il gioco sia il miglior insegnante di vita.",
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
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </section>
    );
  }

  return (
    <section id="staff" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--secondary)' }}>
            Staff
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            I nostri maestri
          </h2>
          <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Professionisti con anni di esperienza nel tennis agonistico e didattico.
          </p>
        </div>

        {/* Staff Grid */}
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {staff.map((member) => (
            <article key={member.id} className="text-center">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt={member.full_name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--background-muted)' }}>
                    <svg className="w-12 h-12" fill="var(--foreground-muted)" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--secondary)' }}>
                {member.full_name}
              </h3>

              {/* Role */}
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--foreground-muted)' }}>
                {member.role}
              </p>

              {/* Bio */}
              <p className="text-sm mb-4 px-2" style={{ color: 'var(--foreground)' }}>
                {member.bio || "Professionista certificato con anni di esperienza."}
              </p>

              {/* Social Icons */}
              <div className="flex justify-center gap-3">
                <a href="#" className="transition-colors" style={{ color: 'var(--foreground-muted)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}>
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="transition-colors" style={{ color: 'var(--foreground-muted)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}>
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="transition-colors" style={{ color: 'var(--foreground-muted)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--secondary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}>
                  <Dribbble className="w-5 h-5" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Join Team CTA */}
        <div className="text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--secondary)' }}>
            Unisciti al team
          </h3>
          <p className="text-base mb-6 max-w-2xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Cerchiamo maestri e istruttori appassionati di tennis e di insegnamento.
          </p>
          <Link
            href="/lavora-con-noi"
            className="inline-block px-8 py-3 rounded-md font-semibold text-base transition-all"
            style={{ 
              backgroundColor: 'white', 
              color: 'var(--secondary)',
              border: '2px solid var(--secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = 'var(--secondary)';
            }}
          >
            Candidati
          </Link>
        </div>
      </div>
    </section>
  );
}