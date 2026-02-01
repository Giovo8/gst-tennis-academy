"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
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
      <section id="staff" className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section id="staff" className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-3 text-secondary/70">
            STAFF
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-secondary">
            I nostri maestri
          </h2>
          <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto text-secondary/70 px-2">
            Professionisti con anni di esperienza nel tennis agonistico e didattico.
          </p>
        </div>

        {/* Staff Grid */}
        <div className="grid gap-8 sm:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12 sm:mb-16 lg:mb-20">
          {staff.map((member, index) => {
            return (
              <div
                key={member.id}
                className="text-center transition-all"
              >
                {/* Card */}
                <div
                  className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Circular Avatar */}
                  <div className="flex justify-center mb-5 sm:mb-6">
                    <div
                      className="relative w-20 sm:w-24 h-20 sm:h-24 rounded-full border-4 border-secondary overflow-hidden flex-shrink-0"
                    >
                      {member.image_url ? (
                        <img
                          src={member.image_url}
                          alt={member.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center bg-secondary/10"
                        >
                          <svg
                            className="w-10 h-10 sm:w-12 sm:h-12 text-secondary"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name with colored underline */}
                  <div className="mb-2">
                    <h3
                      className="text-lg sm:text-xl font-bold pb-2 border-b-2 border-secondary inline-block text-secondary"
                    >
                      {member.full_name}
                    </h3>
                  </div>

                  {/* Role */}
                  <p
                    className="text-xs sm:text-sm font-semibold uppercase tracking-wide mb-3 sm:mb-4 text-secondary/70"
                  >
                    {member.role}
                  </p>

                  {/* Bio */}
                  <p
                    className="text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 text-secondary/70"
                  >
                    {member.bio || 'Professionista certificato con anni di esperienza.'}
                  </p>

                  {/* Social Icons */}
                  <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
                    {member.facebook_url && (
                      <a
                        href={member.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-secondary/70 p-2 rounded-full bg-secondary/5 text-secondary"
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {member.instagram_url && (
                      <a
                        href={member.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-secondary/70 p-2 rounded-full bg-secondary/5 text-secondary"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-secondary/70 p-2 rounded-full bg-secondary/5 text-secondary"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {member.twitter_url && (
                      <a
                        href={member.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-secondary/70 p-2 rounded-full bg-secondary/5 text-secondary"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Join Team CTA */}
        <div className="text-center py-8 sm:py-12 bg-secondary/5 rounded-lg">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-secondary">
            Unisciti al team
          </h3>
          <p className="text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto px-4 text-secondary/70">
            Cerchiamo maestri e istruttori appassionati di tennis e di insegnamento.
          </p>
          <Link
            href="/lavora-con-noi"
            className="inline-block px-8 sm:px-10 py-3 sm:py-3.5 rounded-md font-semibold text-sm sm:text-base transition-all hover:opacity-90 min-h-[48px] touch-manipulation text-white bg-secondary"
          >
            Candidati
          </Link>
        </div>
      </div>
    </section>
  );
}