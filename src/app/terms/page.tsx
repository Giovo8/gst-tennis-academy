import { Metadata } from 'next'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata: Metadata = {
  title: 'Termini e Condizioni | GST Tennis Academy',
  description: 'Termini e condizioni d\'uso del servizio - GST Tennis Academy',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary mb-3 sm:mb-4 px-2">
            Termini e Condizioni
          </h1>
          <p className="text-lg sm:text-xl text-secondary/70 max-w-2xl mx-auto px-4">
            Regole e condizioni per l&apos;utilizzo dei servizi GST Tennis Academy
          </p>
          <p className="text-sm text-secondary/60 mt-4">
            Ultimo aggiornamento: 1 Gennaio 2026
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                1. Accettazione dei Termini
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Accedendo e utilizzando i servizi di GST Tennis Academy (&quot;Servizio&quot;), accetti di essere vincolato da questi Termini e Condizioni (&quot;Termini&quot;). Se non accetti tutti i termini e le condizioni, non dovresti utilizzare questo Servizio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                2. Descrizione del Servizio
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                GST Tennis Academy fornisce una piattaforma online per la prenotazione di campi da tennis, la partecipazione a tornei, l&apos;accesso a corsi e lezioni, e altri servizi correlati al tennis. Il Servizio include anche funzionalità di chat, notifiche e gestione del profilo utente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                3. Registrazione e Account
              </h2>
              <div className="space-y-4">
                <p className="text-secondary/80">
                  Per utilizzare alcuni servizi, devi registrarti e creare un account. Accetti di:
                </p>
                <ul className="list-disc list-inside text-secondary/80 space-y-2">
                  <li>Fornire informazioni accurate, attuali e complete</li>
                  <li>Mantenere e aggiornare tempestivamente le informazioni del tuo account</li>
                  <li>Mantenere la riservatezza della password e dell&apos;account</li>
                  <li>Accettare la responsabilità per tutte le attività che si verificano sotto il tuo account</li>
                  <li>Notificarci immediatamente qualsiasi uso non autorizzato del tuo account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                4. Prenotazioni e Iscrizioni
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Prenotazioni Campi:
                  </h3>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Le prenotazioni sono soggette a disponibilità</li>
                    <li>Le cancellazioni devono essere effettuate almeno 24 ore prima</li>
                    <li>Tariffe di cancellazione tardiva applicabili</li>
                    <li>Non è permesso il subaffitto o la cessione delle prenotazioni</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Iscrizioni a corsi e tornei:
                  </h3>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Le iscrizioni sono soggette a disponibilità e conferma del circolo</li>
                    <li>Le informazioni richieste devono essere corrette e aggiornate</li>
                    <li>Eventuali quote o condizioni organizzative vengono comunicate separatamente dalla segreteria</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                5. Comportamento dell&apos;Utente
              </h2>
              <p className="text-secondary/80 mb-4">
                Accetti di non utilizzare il Servizio per:
              </p>
              <ul className="list-disc list-inside text-secondary/80 space-y-2">
                <li>Viola leggi o regolamenti applicabili</li>
                <li>Infastidire, minacciare o violare i diritti di altri</li>
                <li>Trasmettere contenuti dannosi, offensivi o inappropriati</li>
                <li>Tentare di accedere non autorizzato ai sistemi</li>
                <li>Interferire con il funzionamento normale del Servizio</li>
                <li>Utilizzare il Servizio per scopi commerciali non autorizzati</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                6. Proprietà Intellettuale
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Il Servizio e tutti i suoi contenuti originali, caratteristiche e funzionalità sono di proprietà di GST Tennis Academy e sono protetti da copyright, marchio e altre leggi sulla proprietà intellettuale. Non puoi copiare, modificare, distribuire o creare opere derivate senza autorizzazione scritta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                7. Limitazione di Responsabilità
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                GST Tennis Academy non sarà responsabile per danni indiretti, incidentali, speciali o consequenziali derivanti dall&apos;uso del Servizio. La nostra responsabilità totale sarà comunque limitata nei limiti massimi consentiti dalla legge applicabile.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                8. Risoluzione
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Possiamo terminare o sospendere il tuo account e l&apos;accesso al Servizio immediatamente, senza preavviso, per qualsiasi motivo, incluso se violi questi Termini. In caso di risoluzione, il tuo diritto di utilizzare il Servizio cesserà immediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                9. Modifiche ai Termini
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Possiamo modificare questi Termini in qualsiasi momento. Ti informeremo di eventuali modifiche pubblicandole sul nostro sito. L&apos;uso continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi Termini.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                10. Legge Applicabile
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Questi Termini sono regolati e interpretati in conformità con le leggi italiane. Eventuali controversie saranno risolte dai tribunali competenti di Roma, Italia.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}