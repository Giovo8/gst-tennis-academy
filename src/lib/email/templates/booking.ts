import { baseEmailLayout } from "./layout";

interface BookingConfirmationData {
  user_name: string;
  court_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  total_price: string;
  booking_id: string;
  site_url: string;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData): string {
  const content = `
    <div class="tennis-icon">🎾</div>
    
    <h1>Prenotazione Confermata!</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>La tua prenotazione è stata confermata con successo. Ecco i dettagli:</p>
    
    <div class="success-box">
      <h2 style="margin-top: 0;">Dettagli Prenotazione</h2>
      <p style="margin: 8px 0;"><strong>Campo:</strong> ${data.court_name}</p>
      <p style="margin: 8px 0;"><strong>Data:</strong> ${data.booking_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.booking_time}</p>
      <p style="margin: 8px 0;"><strong>Durata:</strong> ${data.duration_hours} ${data.duration_hours === 1 ? "ora" : "ore"}</p>
      <p style="margin: 8px 0;"><strong>Importo:</strong> ${data.total_price}</p>
      <p style="margin: 8px 0; color: #64748b; font-size: 13px;">Codice: #${data.booking_id}</p>
    </div>
    
    <p>Ti aspettiamo in campo! Ricordati di:</p>
    <ul>
      <li>Presentarti 10 minuti prima dell'orario prenotato</li>
      <li>Portare racchetta e palline (se non noleggiate)</li>
      <li>Indossare abbigliamento sportivo adeguato</li>
      <li>Scarpe da tennis con suola adatta al tipo di superficie</li>
    </ul>
    
    <a href="${data.site_url}/bookings" class="button">Visualizza le Tue Prenotazioni</a>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>Politica di Cancellazione:</strong><br>
        Puoi cancellare gratuitamente fino a 24 ore prima dell'orario prenotato.
      </p>
    </div>
    
    <p>Per qualsiasi domanda, contattaci a info@gst-tennis.it o al numero +39 06 1234567.</p>
    
    <p style="margin-top: 30px;">
      Buon tennis!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Prenotazione confermata per ${data.booking_date} alle ${data.booking_time}`,
    content,
  });
}

interface BookingReminderData {
  user_name: string;
  court_name: string;
  booking_date: string;
  booking_time: string;
  hours_until: number;
  site_url: string;
}

export function bookingReminderTemplate(data: BookingReminderData): string {
  const content = `
    <div class="tennis-icon">⏰</div>
    
    <h1>Promemoria Prenotazione</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>Questo è un promemoria per la tua prenotazione di domani!</p>
    
    <div class="warning-box">
      <h2 style="margin-top: 0;">La tua prenotazione</h2>
      <p style="margin: 8px 0;"><strong>Campo:</strong> ${data.court_name}</p>
      <p style="margin: 8px 0;"><strong>Data:</strong> ${data.booking_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.booking_time}</p>
      <p style="margin: 8px 0; font-size: 18px; color: #f59e0b;">
        <strong>Tra ${data.hours_until} ore</strong>
      </p>
    </div>
    
    <p>Preparati al meglio per la tua sessione di tennis! 🎾</p>
    
    <a href="${data.site_url}/bookings" class="button">Gestisci Prenotazione</a>
    
    <p style="margin-top: 30px;">
      Ci vediamo in campo!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `La tua prenotazione è tra ${data.hours_until} ore`,
    content,
  });
}

interface BookingCancelledData {
  user_name: string;
  court_name: string;
  booking_date: string;
  booking_time: string;
  cancellation_reason?: string;
  refund_amount?: string;
  site_url: string;
}

export function bookingCancelledTemplate(data: BookingCancelledData): string {
  const content = `
    <div class="tennis-icon">❌</div>
    
    <h1>Prenotazione Cancellata</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>La tua prenotazione è stata cancellata.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Dettagli Cancellazione</h2>
      <p style="margin: 8px 0;"><strong>Campo:</strong> ${data.court_name}</p>
      <p style="margin: 8px 0;"><strong>Data:</strong> ${data.booking_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.booking_time}</p>
      ${data.cancellation_reason ? `<p style="margin: 8px 0;"><strong>Motivo:</strong> ${data.cancellation_reason}</p>` : ""}
      ${data.refund_amount ? `<p style="margin: 8px 0; color: #10b981;"><strong>Rimborso:</strong> ${data.refund_amount}</p>` : ""}
    </div>
    
    ${data.refund_amount ? `
      <p>Il rimborso verrà elaborato entro 5-7 giorni lavorativi.</p>
    ` : ""}
    
    <p>Speriamo di vederti presto sui nostri campi!</p>
    
    <a href="${data.site_url}/bookings" class="button">Prenota di Nuovo</a>
    
    <p style="margin-top: 30px;">
      A presto!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: "La tua prenotazione è stata cancellata",
    content,
  });
}
