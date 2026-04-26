"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  order_index?: number | null;
  bio: string | null;
  image_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
};

const defaultStaff: StaffMember[] = [
  {
    id: "default-1",
    full_name: "Marco Rossi",
    role: "Maestro FIT",
    bio: "Specializzato in tecnica e tattica. Lavora con giocatori di ogni livello da quindici anni.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
  {
    id: "default-2",
    full_name: "Giulia Bianchi",
    role: "Istruttrice PTR",
    bio: "Dedita alla formazione dei giovani talenti. Ha preparato campioni regionali e nazionali.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
  {
    id: "default-3",
    full_name: "Andrea Moretti",
    role: "Maestro FIT",
    bio: "Esperto di doppio e preparazione atletica. Segue i giocatori agonisti del club.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
  {
    id: "default-4",
    full_name: "Francesca Gallo",
    role: "Istruttrice PTR",
    bio: "Appassionata di tennis per bambini. Crea programmi ludici che sviluppano passione e tecnica.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
  {
    id: "default-5",
    full_name: "Luca Ferrari",
    role: "Maestro FIT",
    bio: "Specializzato in recupero e prevenzione infortuni. Collabora con fisioterapisti del club.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
  {
    id: "default-6",
    full_name: "Valentina Conti",
    role: "Istruttrice PTR",
    bio: "Insegna tennis a tutte le età. Crede che il gioco sia il miglior insegnante di vita.",
    image_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    twitter_url: null,
  },
];

export default function StaffSection() {
  const [staff, setStaff] = useState<StaffMember[]>(defaultStaff);
  const [loading, setLoading] = useState(true);

  async function loadStaff() {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("active", true)
      .order("order_index", { ascending: true, nullsFirst: false });

    if (error) {
      setStaff(defaultStaff);
    } else if (data && data.length > 0) {
      const sortedData = [...data].sort((a, b) => {
        const aParsed = Number(a.order_index);
        const bParsed = Number(b.order_index);
        const aOrder = Number.isFinite(aParsed) ? aParsed : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(bParsed) ? bParsed : Number.MAX_SAFE_INTEGER;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return (a.full_name || "").localeCompare(b.full_name || "", "it", {
          sensitivity: "base",
        });
      });

      setStaff(sortedData);
    } else {
      setStaff(defaultStaff);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  if (loading) {
    return (
      <section id="staff" className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section id="staff" className="py-20 sm:py-24 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Il team
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            I nostri maestri
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Professionisti con anni di esperienza nel tennis agonistico e didattico.
          </p>
        </div>

        {/* Staff Grid */}
        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-16 sm:mb-20">
          {staff.map((member) => (
            <article
              key={member.id}
              className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Square image */}
              <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt={member.full_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                    <svg
                      className="w-24 h-24"
                      style={{ color: "var(--secondary)", opacity: 0.35 }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-6 sm:p-7">
                <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-2 tracking-tight leading-tight">
                  {member.full_name}
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary/60 mb-4">
                  {member.role}
                </p>
                <p className="text-sm leading-relaxed text-gray-500 mb-6 flex-1">
                  {member.bio || 'Professionista certificato con anni di esperienza.'}
                </p>

                {/* Socials */}
                {(member.facebook_url || member.instagram_url || member.linkedin_url || member.twitter_url) && (
                  <div className="flex gap-2 pt-5 border-t border-gray-100">
                    {member.facebook_url && (
                      <a
                        href={member.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Facebook di ${member.full_name}`}
                        className="p-2 rounded-full text-secondary hover:bg-secondary hover:text-white transition-colors"
                      >
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {member.instagram_url && (
                      <a
                        href={member.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Instagram di ${member.full_name}`}
                        className="p-2 rounded-full text-secondary hover:bg-secondary hover:text-white transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`LinkedIn di ${member.full_name}`}
                        className="p-2 rounded-full text-secondary hover:bg-secondary hover:text-white transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {member.twitter_url && (
                      <a
                        href={member.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Twitter di ${member.full_name}`}
                        className="p-2 rounded-full text-secondary hover:bg-secondary hover:text-white transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Join Team CTA */}
        <div className="text-center pt-4 pb-2 border-t border-gray-100 mt-4">
          <h3 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Unisciti al team
          </h3>
          <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto text-gray-500">
            Cerchiamo maestri e istruttori appassionati di tennis e di insegnamento.
          </p>
          <Link
            href="/lavora-con-noi"
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md border border-secondary text-secondary hover:bg-secondary hover:text-white transition-all"
          >
            Candidati
          </Link>
        </div>
      </div>
    </section>
  );
}