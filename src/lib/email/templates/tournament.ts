import { baseEmailLayout } from "./layout";

interface TournamentRegistrationData {
  user_name: string;
  tournament_name: string;
  tournament_date: string;
  tournament_location: string;
  category: string;
  registration_fee: string;
  tournament_id: string;
  site_url: string;
}

export function tournamentRegistrationTemplate(data: TournamentRegistrationData): string {
  const content = `
    <div class="tennis-icon">🏆</div>
    
    <h1>Iscrizione al Torneo Confermata!</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>Sei ufficialmente iscritto al torneo! Preparati a dare il massimo in campo.</p>
    
    <div class="success-box">
      <h2 style="margin-top: 0;">Dettagli Torneo</h2>
      <p style="margin: 8px 0;"><strong>Torneo:</strong> ${data.tournament_name}</p>
      <p style="margin: 8px 0;"><strong>Data Inizio:</strong> ${data.tournament_date}</p>
      <p style="margin: 8px 0;"><strong>Sede:</strong> ${data.tournament_location}</p>
      <p style="margin: 8px 0;"><strong>Categoria:</strong> ${data.category}</p>
      <p style="margin: 8px 0;"><strong>Quota Iscrizione:</strong> ${data.registration_fee}</p>
    </div>
    
    <h2>Cosa Portare</h2>
    <ul>
      <li><strong>Racchette:</strong> Porta almeno 2 racchette incordate</li>
      <li><strong>Abbigliamento:</strong> Magliette di ricambio e abbigliamento sportivo</li>
      <li><strong>Palline:</strong> Nuova scatola di palline da tennis</li>
      <li><strong>Documento:</strong> Documento d'identità e tessera FIT (se richiesta)</li>
      <li><strong>Accessori:</strong> Asciugamano, borraccia, cappello/visiera</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>Orario Presentazione:</strong><br>
        Presentati almeno 30 minuti prima dell'orario del tuo primo match per il check-in e il riscaldamento.
      </p>
    </div>
    
    <a href="${data.site_url}/tornei/${data.tournament_id}" class="button">Visualizza Tabellone</a>
    
    <h2>Regolamento Tennis</h2>
    <p>Il torneo si svolgerà secondo il regolamento FIT. Formato partite:</p>
    <ul>
      <li>Set al meglio dei 3 (primo a vincere 2 set)</li>
      <li>Tie-break sul 6-6 in ogni set</li>
      <li>Super tie-break (primo a 10 punti) in caso di 1 set pari</li>
    </ul>
    
    <p style="margin-top: 30px;">
      In bocca al lupo per il torneo!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Iscrizione confermata per ${data.tournament_name}`,
    content,
  });
}

interface TournamentReminderData {
  user_name: string;
  tournament_name: string;
  first_match_date: string;
  first_match_time: string;
  opponent_name?: string;
  court_number: string;
  site_url: string;
}

export function tournamentReminderTemplate(data: TournamentReminderData): string {
  const content = `
    <div class="tennis-icon">🎾</div>
    
    <h1>Promemoria Torneo</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>Il tuo torneo inizia presto! Ecco i dettagli del tuo primo match.</p>
    
    <div class="warning-box">
      <h2 style="margin-top: 0;">Primo Match</h2>
      <p style="margin: 8px 0;"><strong>Torneo:</strong> ${data.tournament_name}</p>
      <p style="margin: 8px 0;"><strong>Data:</strong> ${data.first_match_date}</p>
      <p style="margin: 8px 0;"><strong>Orario:</strong> ${data.first_match_time}</p>
      <p style="margin: 8px 0;"><strong>Campo:</strong> ${data.court_number}</p>
      ${data.opponent_name ? `<p style="margin: 8px 0;"><strong>Avversario:</strong> ${data.opponent_name}</p>` : ""}
    </div>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>💡 Consigli Pre-Match:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Arriva 30 minuti prima per il riscaldamento</li>
        <li>Idratati bene prima e durante il match</li>
        <li>Fai stretching per evitare infortuni</li>
        <li>Concentrati sul tuo gioco e gestisci l'energia</li>
      </ul>
    </div>
    
    <a href="${data.site_url}/tornei" class="button">Vedi Tabellone Completo</a>
    
    <p style="margin-top: 30px;">
      Buona fortuna!<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: `Il tuo match è il ${data.first_match_date} alle ${data.first_match_time}`,
    content,
  });
}

interface TournamentResultsData {
  user_name: string;
  tournament_name: string;
  final_position: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  is_winner: boolean;
  site_url: string;
}

export function tournamentResultsTemplate(data: TournamentResultsData): string {
  const content = `
    <div class="tennis-icon">${data.is_winner ? "🏆" : "🎾"}</div>
    
    <h1>${data.is_winner ? "Complimenti Campione!" : "Torneo Concluso"}</h1>
    
    <p>Ciao <strong>${data.user_name}</strong>,</p>
    
    <p>${data.is_winner ? "Che grande vittoria! Hai dominato il torneo dall'inizio alla fine. 🎉" : "Il torneo è concluso. Ottima prestazione!"}</p>
    
    <div class="${data.is_winner ? "success-box" : "info-box"}">
      <h2 style="margin-top: 0;">Le Tue Statistiche</h2>
      <p style="margin: 8px 0;"><strong>Torneo:</strong> ${data.tournament_name}</p>
      <p style="margin: 8px 0; font-size: 24px; color: ${data.is_winner ? "#10b981" : "#3b82f6"};">
        <strong>${data.final_position}</strong>
      </p>
      <p style="margin: 8px 0;"><strong>Match Giocati:</strong> ${data.matches_played}</p>
      <p style="margin: 8px 0;"><strong>Vittorie:</strong> ${data.matches_won}</p>
      <p style="margin: 8px 0;"><strong>Sconfitte:</strong> ${data.matches_lost}</p>
      <p style="margin: 8px 0;"><strong>Set Vinti:</strong> ${data.sets_won}</p>
      <p style="margin: 8px 0;"><strong>Set Persi:</strong> ${data.sets_lost}</p>
    </div>
    
    ${data.is_winner ? `
      <p>Il tuo premio ti verrà consegnato presso la nostra accademia. Contattaci per ritirarlo!</p>
    ` : `
      <p>Continua ad allenarti, ogni torneo è un'opportunità per migliorare il tuo gioco!</p>
    `}
    
    <a href="${data.site_url}/tornei" class="button">Vedi Classifica Completa</a>
    
    <div class="info-box">
      <p style="margin: 0;">
        <strong>Prossimi Tornei:</strong><br>
        Resta sintonizzato per i prossimi tornei GST Tennis Academy. Ti invieremo le informazioni appena disponibili!
      </p>
    </div>
    
    <p style="margin-top: 30px;">
      ${data.is_winner ? "Ancora complimenti!" : "Ci vediamo al prossimo torneo!"}<br>
      <strong>Il Team GST Tennis Academy</strong>
    </p>
  `;

  return baseEmailLayout({
    preheader: data.is_winner ? `Complimenti, hai vinto ${data.tournament_name}!` : `Risultati ${data.tournament_name}`,
    content,
  });
}
