import { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata: Metadata = {
  title: 'Privacy Policy | GST Tennis Academy',
  description: 'Informativa sulla privacy e protezione dei dati personali - GST Tennis Academy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary mb-3 sm:mb-4 px-2">
            Privacy Policy
          </h1>
          <p className="text-lg sm:text-xl text-secondary/70 max-w-2xl mx-auto px-4">
            La tua privacy e` importante per noi. Scopri come proteggiamo e gestiamo i tuoi dati personali.
          </p>
          <p className="text-sm text-secondary/60 mt-4">
            Ultimo aggiornamento: 1 Gennaio 2026
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                1. Introduzione
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                GST Tennis Academy (&quot;noi&quot;, &quot;nostro&quot; o &quot;GST&quot;) si impegna a proteggere la privacy degli utenti del nostro sito web e dei nostri servizi. Questa Privacy Policy spiega come raccogliamo, utilizziamo, divulghiamo e proteggiamo le informazioni personali degli utenti in conformita` con il Regolamento Generale sulla Protezione dei Dati (GDPR) UE 2016/679.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                2. Dati che raccogliamo
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Dati forniti direttamente:
                  </h3>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Nome e cognome</li>
                    <li>Indirizzo email</li>
                    <li>Numero di telefono</li>
                    <li>Data di nascita</li>
                    <li>Informazioni relative a prenotazioni, iscrizioni e preferenze di utilizzo</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Dati raccolti automaticamente:
                  </h3>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Indirizzo IP</li>
                    <li>Tipo di browser e versione</li>
                    <li>Pagina di riferimento</li>
                    <li>Tempo di visita e pagine visualizzate</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                3. Come utilizziamo i tuoi dati
              </h2>
              <p className="text-secondary/80 mb-4">
                Utilizziamo le informazioni raccolte per:
              </p>
              <ul className="list-disc list-inside text-secondary/80 space-y-2">
                <li>Fornire e gestire i nostri servizi di prenotazione campi e tornei</li>
                <li>Comunicare con te riguardo alle tue prenotazioni e attivita`</li>
                <li>Migliorare i nostri servizi e l&apos;esperienza utente</li>
                <li>Inviare notifiche importanti relative al tuo account</li>
                <li>Conformarci agli obblighi legali e normativi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                4. Condivisione dei dati
              </h2>
              <p className="text-secondary/80 mb-4">
                Non vendiamo, noleggiamo o condividiamo le tue informazioni personali con terze parti, eccetto nei seguenti casi:
              </p>
              <ul className="list-disc list-inside text-secondary/80 space-y-2">
                <li>Con il tuo consenso esplicito</li>
                <li>Per fornire i servizi richiesti, come gestione account, prenotazioni e notifiche</li>
                <li>Quando richiesto dalla legge o per proteggere i nostri diritti</li>
                <li>Con fornitori di servizi affidabili che rispettano la privacy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                5. Sicurezza dei dati
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Implementiamo misure di sicurezza tecniche e organizzative appropriate per proteggere i tuoi dati personali contro accessi non autorizzati, alterazioni, divulgazioni o distruzioni. Utilizziamo crittografia SSL/TLS per la trasmissione dei dati e manteniamo sistemi di sicurezza avanzati.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                6. I tuoi diritti
              </h2>
              <p className="text-secondary/80 mb-4">
                Ai sensi del GDPR, hai i seguenti diritti:
              </p>
              <ul className="list-disc list-inside text-secondary/80 space-y-2">
                <li><strong>Diritto di accesso:</strong> Richiedere una copia dei tuoi dati personali</li>
                <li><strong>Diritto di rettifica:</strong> Correggere dati inesatti o incompleti</li>
                <li><strong>Diritto alla cancellazione:</strong> Richiedere la cancellazione dei tuoi dati</li>
                <li><strong>Diritto di limitazione:</strong> Limitare il trattamento dei tuoi dati</li>
                <li><strong>Diritto alla portabilita`:</strong> Ricevere i tuoi dati in formato strutturato</li>
                <li><strong>Diritto di opposizione:</strong> Opporsi al trattamento dei tuoi dati</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                7. Cookie e tecnologie simili
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza sul nostro sito. Per maggiori dettagli, consulta la nostra{' '}
                <Link href="/cookie-policy" className="text-secondary font-semibold underline transition-opacity hover:opacity-80">
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                8. Modifiche alla Privacy Policy
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Possiamo aggiornare questa Privacy Policy di tanto in tanto. Ti informeremo di eventuali modifiche significative pubblicandole sul nostro sito web e, se necessario, contattandoti direttamente.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}