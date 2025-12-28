import { baseEmailLayout } from "./layout";

interface LessonRequestData {
  student_name: string;
  coach_name: string;
  requested_date: string;
  requested_time: string;
  lesson_type: string;
  duration: string;
  site_url: string;
}

export function lessonRequestTemplate(data: LessonRequestData): string {
  const content = `
    <div class="tennis-icon">🎓</div>
    
    <h1>Richiesta Lezione Ricevuta</h1>
    
    <p>Ciao <strong>${data.student_name}</strong>,</p>
    
    <p>Abbiamo ricevuto la tua richiesta di lezione. Il maestro <strong>${data.coach_name}</strong> la confermerà a breve.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Dettagli Richiesta</h2>
      <p style="margin: 8px 0;"><strong>Maestro:</strong> ${data.coach_name}</p>
      <p style="margin: 8px 0;"><strong>Data Richiesta:</strong> ${data.requested_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.requested_time}</p>
      <p style="margin: 8px 0;"><strong>Tipo Lezione:</strong> ${data.lesson_type}</p>
      <p style="margin: 8px 0;"><strong>Durata:</strong> ${data.duration}</p>
    </div>
    
    <p>Riceverai una conferma via email non appena il maestro avrà approvato la lezione.</p>
    
    <a href="${data.site_url}/dashboard" class="button">Vai al Dashboard</a>
    
    <p style="margin-top: 30px;">
      A presto!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Richiesta lezione con ${data.coach_name} ricevuta`,
    content,
  });
}

interface LessonConfirmedData {
  student_name: string;
  coach_name: string;
  lesson_date: string;
  lesson_time: string;
  court_name: string;
  lesson_type: string;
  duration: string;
  site_url: string;
}

export function lessonConfirmedTemplate(data: LessonConfirmedData): string {
  const content = `
    <div class="tennis-icon">✅</div>
    
    <h1>Lezione Confermata!</h1>
    
    <p>Ciao <strong>${data.student_name}</strong>,</p>
    
    <p>Ottima notizia! Il maestro <strong>${data.coach_name}</strong> ha confermato la tua lezione.</p>
    
    <div class="success-box">
      <h2 style="margin-top: 0;">Dettagli Lezione</h2>
      <p style="margin: 8px 0;"><strong>Maestro:</strong> ${data.coach_name}</p>
      <p style="margin: 8px 0;"><strong>Data:</strong> ${data.lesson_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.lesson_time}</p>
      <p style="margin: 8px 0;"><strong>Campo:</strong> ${data.court_name}</p>
      <p style="margin: 8px 0;"><strong>Tipo:</strong> ${data.lesson_type}</p>
      <p style="margin: 8px 0;"><strong>Durata:</strong> ${data.duration}</p>
    </div>
    
    <h2>Preparazione alla Lezione</h2>
    <ul>
      <li>Arriva 10 minuti prima per il check-in</li>
      <li>Porta racchetta, abbigliamento sportivo e acqua</li>
      <li>Se possibile, fai un leggero riscaldamento prima</li>
      <li>Comunica al maestro i tuoi obiettivi specifici</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>Cancellazione:</strong> Se non puoi partecipare, avvisa almeno 24 ore prima per evitare penali.
      </p>
    </div>
    
    <a href="${data.site_url}/dashboard/atleta" class="button">Visualizza Calendario Lezioni</a>
    
    <p style="margin-top: 30px;">
      Buona lezione!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Lezione confermata per ${data.lesson_date}`,
    content,
  });
}

interface AnnouncementNotificationData {
  user_name: string;
  announcement_title: string;
  announcement_content: string;
  announcement_type: string;
  priority: string;
  site_url: string;
  announcement_id: string;
}

export function announcementNotificationTemplate(data: AnnouncementNotificationData): string {
  const priorityColors: Record<string, string> = {
    urgent: "#dc2626",
    high: "#ea580c",
    medium: "#3b82f6",
    low: "#64748b",
  };

  const content = `
    <div class="tennis-icon">📢</div>
    
    <h1 style="color: ${priorityColors[data.priority] || "#333"};">
      ${data.priority === "urgent" ? "⚠️ " : ""}Nuovo Annuncio
    </h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>C'è un nuovo annuncio importante da GST Tennis Academy:</p>
    
    <div class="${data.priority === "urgent" ? "warning-box" : "info-box"}">
      <h2 style="margin-top: 0;">${data.announcement_title}</h2>
      <p style="margin: 0;">${data.announcement_content}</p>
    </div>
    
    <a href="${data.site_url}/dashboard" class="button">Leggi Tutti gli Annunci</a>
    
    <p style="margin-top: 30px;">
      A presto!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: data.announcement_title,
    content,
  });
}

interface SubscriptionCreatedData {
  user_name: string;
  subscription_name: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  benefits: string[];
  site_url: string;
}

export function subscriptionCreatedTemplate(data: SubscriptionCreatedData): string {
  const content = `
    <div class="tennis-icon">💳</div>
    
    <h1>Abbonamento Attivato!</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>Il tuo abbonamento è stato attivato con successo. Benvenuto nella famiglia GST!</p>
    
    <div class="success-box">
      <h2 style="margin-top: 0;">Dettagli Abbonamento</h2>
      <p style="margin: 8px 0;"><strong>Piano:</strong> ${data.subscription_name}</p>
      <p style="margin: 8px 0;"><strong>Tipo:</strong> ${data.subscription_type}</p>
      <p style="margin: 8px 0;"><strong>Inizio:</strong> ${data.start_date}</p>
      <p style="margin: 8px 0;"><strong>Scadenza:</strong> ${data.end_date}</p>
    </div>
    
    <h2>I Tuoi Vantaggi</h2>
    <ul>
      ${data.benefits.map((benefit) => `<li>${benefit}</li>`).join("")}
    </ul>
    
    <a href="${data.site_url}/profile" class="button">Visualizza Profilo</a>
    
    <p style="margin-top: 30px;">
      Buon tennis!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Abbonamento ${data.subscription_name} attivato`,
    content,
  });
}

interface WelcomeEmailData {
  user_name: string;
  site_url: string;
}

export function welcomeEmailTemplate(data: WelcomeEmailData): string {
  const content = `
    <div class="tennis-icon">👋</div>
    
    <h1>Benvenuto in GST Tennis Academy!</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>Siamo entusiasti di darti il benvenuto nella nostra accademia! Preparati a vivere un'esperienza di tennis straordinaria.</p>
    
    <h2>Cosa Puoi Fare</h2>
    <ul>
      <li><strong>Prenota Campi:</strong> Scegli data, ora e campo preferito</li>
      <li><strong>Iscriviti ai Tornei:</strong> Partecipa ai nostri tornei tennis regolari</li>
      <li><strong>Prenota Lezioni:</strong> Migliora con i nostri maestri certificati</li>
      <li><strong>Segui le News:</strong> Rimani aggiornato su eventi e novità</li>
    </ul>
    
    <a href="${data.site_url}/dashboard" class="button">Inizia Ora</a>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">🎾 I Nostri Servizi</h2>
      <p><strong>Campi da Tennis:</strong> 8 campi professionali (terra rossa, cemento, erba sintetica)</p>
      <p><strong>Corsi:</strong> Per tutti i livelli, da principianti ad agonisti</p>
      <p><strong>Tornei:</strong> Calendario ricco con format innovativi (gironi + eliminazione diretta)</p>
      <p><strong>Pro Shop:</strong> Racchette, abbigliamento e accessori</p>
    </div>
    
    <h2>Hai Domande?</h2>
    <p>Il nostro team è sempre disponibile per aiutarti. Contattaci a:</p>
    <ul>
      <li>📧 Email: info@gst-tennis.it</li>
      <li>📞 Telefono: +39 06 1234567</li>
      <li>💬 Chat: Disponibile dal tuo dashboard</li>
    </ul>
    
    <p style="margin-top: 30px;">
      Ci vediamo in campo!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: "Benvenuto nella famiglia GST Tennis Academy!",
    content,
  });
}
