export type BookingEmailAction = "created" | "updated" | "deleted";

type BookingTypeTemplate = Record<
  BookingEmailAction,
  {
    subjectPrefix: string;
    bannerLabel: string;
    title: string;
    intro: string;
    textLead: string;
  }
>;

export type BookingEmailCopy = {
  subjectPrefix: string;
  bannerLabel: string;
  title: string;
  intro: string;
  textLead: string;
};

const TYPE_LABELS: Record<string, string> = {
  campo: "Campo",
  lezione: "Lezione",
  lezione_privata: "Lezione privata",
  lezione_gruppo: "Lezione di gruppo",
};

const TYPE_TEMPLATES: Record<string, BookingTypeTemplate> = {
  lezione_privata: {
    created: {
      subjectPrefix: "Nuova lezione privata prenotata",
      bannerLabel: "Notifica lezione privata",
      title: "Nuova lezione privata prenotata",
      intro: "E stata registrata una nuova lezione privata.",
      textLead: "Nuova lezione privata prenotata",
    },
    updated: {
      subjectPrefix: "Lezione privata modificata",
      bannerLabel: "Notifica modifica lezione privata",
      title: "Lezione privata modificata",
      intro: "Una lezione privata e stata modificata: qui sotto trovi i nuovi dettagli.",
      textLead: "Lezione privata modificata",
    },
    deleted: {
      subjectPrefix: "Lezione privata eliminata",
      bannerLabel: "Notifica eliminazione lezione privata",
      title: "Lezione privata eliminata",
      intro: "Una lezione privata e stata eliminata dal calendario.",
      textLead: "Lezione privata eliminata",
    },
  },
  lezione_gruppo: {
    created: {
      subjectPrefix: "Nuova lezione di gruppo prenotata",
      bannerLabel: "Notifica lezione di gruppo",
      title: "Nuova lezione di gruppo prenotata",
      intro: "E stata registrata una nuova lezione di gruppo.",
      textLead: "Nuova lezione di gruppo prenotata",
    },
    updated: {
      subjectPrefix: "Lezione di gruppo modificata",
      bannerLabel: "Notifica modifica lezione di gruppo",
      title: "Lezione di gruppo modificata",
      intro: "Una lezione di gruppo e stata modificata: qui sotto trovi i nuovi dettagli.",
      textLead: "Lezione di gruppo modificata",
    },
    deleted: {
      subjectPrefix: "Lezione di gruppo eliminata",
      bannerLabel: "Notifica eliminazione lezione di gruppo",
      title: "Lezione di gruppo eliminata",
      intro: "Una lezione di gruppo e stata eliminata dal calendario.",
      textLead: "Lezione di gruppo eliminata",
    },
  },
  lezione: {
    created: {
      subjectPrefix: "Nuova lezione prenotata",
      bannerLabel: "Notifica lezione",
      title: "Nuova lezione prenotata",
      intro: "E stata registrata una nuova lezione.",
      textLead: "Nuova lezione prenotata",
    },
    updated: {
      subjectPrefix: "Lezione modificata",
      bannerLabel: "Notifica modifica lezione",
      title: "Lezione modificata",
      intro: "Una lezione e stata modificata: qui sotto trovi i nuovi dettagli.",
      textLead: "Lezione modificata",
    },
    deleted: {
      subjectPrefix: "Lezione eliminata",
      bannerLabel: "Notifica eliminazione lezione",
      title: "Lezione eliminata",
      intro: "Una lezione e stata eliminata dal calendario.",
      textLead: "Lezione eliminata",
    },
  },
  campo: {
    created: {
      subjectPrefix: "Nuova prenotazione registrata",
      bannerLabel: "Notifica prenotazione",
      title: "Nuova prenotazione registrata",
      intro: "E stata registrata una nuova prenotazione e il calendario campi e stato aggiornato.",
      textLead: "Nuova prenotazione registrata",
    },
    updated: {
      subjectPrefix: "Prenotazione modificata",
      bannerLabel: "Notifica modifica prenotazione",
      title: "Prenotazione modificata",
      intro: "Una prenotazione e stata modificata e il calendario campi e stato aggiornato.",
      textLead: "Prenotazione modificata",
    },
    deleted: {
      subjectPrefix: "Prenotazione eliminata",
      bannerLabel: "Notifica eliminazione prenotazione",
      title: "Prenotazione eliminata",
      intro: "Una prenotazione e stata eliminata dal calendario campi.",
      textLead: "Prenotazione eliminata",
    },
  },
};

function normalizeBookingType(type: string): string {
  return type.trim().toLowerCase();
}

export function isPrivateLessonType(type: string): boolean {
  return normalizeBookingType(type) === "lezione_privata";
}

export function getBookingTypeLabel(type: string): string {
  const normalizedType = normalizeBookingType(type);
  const knownLabel = TYPE_LABELS[normalizedType];
  if (knownLabel) {
    return knownLabel;
  }

  const words = normalizedType
    .replace(/_/g, " ")
    .split(" ")
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "Prenotazione";
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function getBookingEmailCopy(params: {
  action: BookingEmailAction;
  bookingType: string;
}): BookingEmailCopy {
  const normalizedType = normalizeBookingType(params.bookingType);
  const typeTemplate = TYPE_TEMPLATES[normalizedType] || TYPE_TEMPLATES.campo;
  return typeTemplate[params.action];
}