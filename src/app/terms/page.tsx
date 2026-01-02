import { Metadata } from 'next'
import { FileText, Mail, Phone, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termini e Condizioni | GST Tennis Academy',
  description: 'Termini e condizioni d\'uso del servizio - GST Tennis Academy',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-frozen-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-frozen-600 rounded-full mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Termini e Condizioni
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Regole e condizioni per l'utilizzo dei servizi GST Tennis Academy
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Ultimo aggiornamento: 1 Gennaio 2026
          </p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Accettazione dei Termini
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Accedendo e utilizzando i servizi di GST Tennis Academy ("Servizio"), accetti di essere vincolato da questi Termini e Condizioni ("Termini"). Se non accetti tutti i termini e le condizioni, non dovresti utilizzare questo Servizio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Descrizione del Servizio
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                GST Tennis Academy fornisce una piattaforma online per la prenotazione di campi da tennis, la partecipazione a tornei, l'accesso a corsi e lezioni, e altri servizi correlati al tennis. Il Servizio include anche funzionalità di chat, notifiche e gestione del profilo utente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Registrazione e Account
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Per utilizzare alcuni servizi, devi registrarti e creare un account. Accetti di:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Fornire informazioni accurate, attuali e complete</li>
                  <li>Mantenere e aggiornare tempestivamente le informazioni del tuo account</li>
                  <li>Mantenere la riservatezza della password e dell'account</li>
                  <li>Accettare la responsabilità per tutte le attività che si verificano sotto il tuo account</li>
                  <li>Notificarci immediatamente qualsiasi uso non autorizzato del tuo account</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Prenotazioni e Pagamenti
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Prenotazioni Campi:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Le prenotazioni sono soggette a disponibilità</li>
                    <li>Le cancellazioni devono essere effettuate almeno 24 ore prima</li>
                    <li>Tariffe di cancellazione tardiva applicabili</li>
                    <li>Non è permesso il subaffitto o la cessione delle prenotazioni</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Pagamenti:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Tutti i pagamenti sono elaborati in modo sicuro</li>
                    <li>Le tariffe sono indicate chiaramente prima della conferma</li>
                    <li>I pagamenti sono non rimborsabili salvo eccezioni specifiche</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Comportamento dell'Utente
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Accetti di non utilizzare il Servizio per:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li>Viola leggi o regolamenti applicabili</li>
                <li>Infastidire, minacciare o violare i diritti di altri</li>
                <li>Trasmettere contenuti dannosi, offensivi o inappropriati</li>
                <li>Tentare di accedere non autorizzato ai sistemi</li>
                <li>Interferire con il funzionamento normale del Servizio</li>
                <li>Utilizzare il Servizio per scopi commerciali non autorizzati</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Proprietà Intellettuale
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Il Servizio e tutti i suoi contenuti originali, caratteristiche e funzionalità sono di proprietà di GST Tennis Academy e sono protetti da copyright, marchio e altre leggi sulla proprietà intellettuale. Non puoi copiare, modificare, distribuire o creare opere derivate senza autorizzazione scritta.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Limitazione di Responsabilità
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                GST Tennis Academy non sarà responsabile per danni indiretti, incidentali, speciali o consequenziali derivanti dall'uso del Servizio. La nostra responsabilità totale non supererà l'importo pagato per il Servizio negli ultimi 12 mesi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Risoluzione
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Possiamo terminare o sospendere il tuo account e l'accesso al Servizio immediatamente, senza preavviso, per qualsiasi motivo, incluso se violi questi Termini. In caso di risoluzione, il tuo diritto di utilizzare il Servizio cesserà immediatamente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Modifiche ai Termini
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Possiamo modificare questi Termini in qualsiasi momento. Ti informeremo di eventuali modifiche pubblicandole sul nostro sito. L'uso continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi Termini.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Legge Applicabile
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Questi Termini sono regolati e interpretati in conformità con le leggi italiane. Eventuali controversie saranno risolte dai tribunali competenti di Roma, Italia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Contatti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Per domande sui Termini e Condizioni, contattaci:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-frozen-600" />
                    <span className="text-gray-700 dark:text-gray-300">info@gsttennis.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-frozen-600" />
                    <span className="text-gray-700 dark:text-gray-300">+39 123 456 7890</span>
                  </div>
                  <div className="flex items-center space-x-3 md:col-span-2">
                    <MapPin className="w-5 h-5 text-frozen-600" />
                    <span className="text-gray-700 dark:text-gray-300">Via del Tennis 123, 00100 Roma, Italia</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}