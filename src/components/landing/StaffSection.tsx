"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Facebook, Instagram, Linkedin, Twitter, ChevronLeft, ChevronRight } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const draggedDistance = useRef(0);
  const suppressNextClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;

    isDragging.current = true;
    startX.current = event.clientX;
    startScrollLeft.current = el.scrollLeft;
    draggedDistance.current = 0;
    suppressNextClick.current = false;

    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !isDragging.current) return;

    if ((event.buttons & 1) === 0) {
      stopDragging();
      return;
    }

    const deltaX = event.clientX - startX.current;
    draggedDistance.current = Math.max(draggedDistance.current, Math.abs(deltaX));
    el.scrollLeft = startScrollLeft.current - deltaX * 1.8;

    if (draggedDistance.current > 10) {
      suppressNextClick.current = true;
    }

    if (draggedDistance.current > 2) {
      event.preventDefault();
    }
  }

  function stopDragging() {
    const el = scrollRef.current;

    isDragging.current = false;
    if (draggedDistance.current <= 10) {
      suppressNextClick.current = false;
    }

    if (el) {
      el.style.cursor = "grab";
      el.style.userSelect = "auto";
    }
  }

  function handleLinkClickCapture(event: React.MouseEvent<HTMLAnchorElement>) {
    if (suppressNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick.current = false;
    }
  }

  function preventNativeDrag(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function scrollTo(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320 + 24; // w-80 + gap-6
    if (direction === "right") {
      el.scrollBy({ left: cardWidth, behavior: "smooth" });
    } else {
      el.scrollBy({ left: -cardWidth, behavior: "smooth" });
    }
  }

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
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 sm:mb-16 text-center flex flex-col items-center">
          <h2 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            I nostri maestri
          </h2>
          <p className="text-base sm:text-lg max-w-2xl text-gray-500">
            Professionisti con anni di esperienza nel tennis agonistico e didattico.
          </p>
        </div>

        {/* Staff Scroll Row */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => stopDragging()}
          onPointerCancel={() => stopDragging()}
          onPointerLeave={() => stopDragging()}
          onDragStart={preventNativeDrag}
          className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory mb-6 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [padding-inline:calc(50%-9rem)] sm:[padding-inline:0]"
        >
          {staff.map((member, i) => (
            <article
              key={`${member.id}-${i}`}
              className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex-shrink-0 w-72 sm:w-80 snap-center"
            >
              {/* 16/9 image */}
              <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt={member.full_name}
                    draggable={false}
                    onDragStart={preventNativeDrag}
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
                {/* Socials */}
                {(member.facebook_url || member.instagram_url || member.linkedin_url || member.twitter_url) && (
                  <div className="flex gap-2 pt-5 border-t border-gray-200">
                    {member.facebook_url && (
                      <a
                        href={member.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClickCapture={handleLinkClickCapture}
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
                        onClickCapture={handleLinkClickCapture}
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
                        onClickCapture={handleLinkClickCapture}
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
                        onClickCapture={handleLinkClickCapture}
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

        {/* Nav buttons */}
        <div className="flex justify-center gap-2 mb-8 sm:mb-10">
          <button
            onClick={() => scrollTo("left")}
            aria-label="Scorri a sinistra"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollTo("right")}
            aria-label="Scorri a destra"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Join Team CTA */}
        <div className="text-center pt-0 pb-2 mt-0">
          <h3 className="text-[12vw] md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Unisciti al team
          </h3>
          <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto text-gray-500">
            Cerchiamo maestri e istruttori appassionati di tennis e di insegnamento.
          </p>
          <Link
            href="/lavora-con-noi"
            className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3.5 sm:py-3 text-sm font-medium text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all"
          >
            Candidati
          </Link>
        </div>
      </div>
    </section>
  );
}