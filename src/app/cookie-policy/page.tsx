import { Metadata } from 'next'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata: Metadata = {
  title: 'Cookie Policy | GST Tennis Academy',
  description: 'Informativa sui cookie utilizzati dal sito - GST Tennis Academy',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-secondary mb-3 sm:mb-4 px-2">
            Cookie Policy
          </h1>
          <p className="text-lg sm:text-xl text-secondary/70 max-w-2xl mx-auto px-4">
            Scopri come utilizziamo i cookie per migliorare la tua esperienza sul nostro sito
          </p>
          <p className="text-sm text-secondary/60 mt-4">
            Ultimo aggiornamento: 1 Gennaio 2026
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                1. Cosa Sono i Cookie
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                I cookie sono piccoli file di testo che vengono salvati sul tuo dispositivo quando visiti un sito web. Ci aiutano a fornire e migliorare i nostri servizi, personalizzare la tua esperienza e analizzare l&apos;utilizzo del sito.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                2. Tipi di Cookie che Utilizziamo
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-secondary mb-3">
                    Cookie Essenziali
                  </h3>
                  <p className="text-secondary/80 mb-3">
                    Questi cookie sono necessari per il funzionamento del sito e non possono essere disattivati.
                  </p>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Autenticazione e sicurezza della sessione</li>
                    <li>Accesso alle aree riservate e protezione dell&apos;account</li>
                    <li>Memorizzazione di preferenze tecniche indispensabili</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-secondary mb-3">
                    Cookie Funzionali
                  </h3>
                  <p className="text-secondary/80 mb-3">
                    Migliorano la fruizione del sito e aiutano a mantenere alcune preferenze utili durante la navigazione.
                  </p>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Ricordo di alcune preferenze di navigazione</li>
                    <li>Mantenimento dello stato di alcune operazioni, come prenotazioni o compilazione form</li>
                    <li>Miglioramento dell&apos;usabilita` complessiva del sito</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-secondary mb-3">
                    Cookie Tecnici di Sicurezza e Prestazioni
                  </h3>
                  <p className="text-secondary/80 mb-3">
                    Possono essere utilizzati per garantire stabilita`, prevenire abusi e diagnosticare problemi tecnici della piattaforma.
                  </p>
                  <ul className="list-disc list-inside text-secondary/80 space-y-1">
                    <li>Protezione contro utilizzi anomali o non autorizzati</li>
                    <li>Supporto alla stabilita` del servizio</li>
                    <li>Raccolta di informazioni tecniche aggregate quando necessario per manutenzione e diagnostica</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-secondary/80 leading-relaxed">
                    In base alla configurazione attuale del sito, non utilizziamo cookie di marketing o profilazione per pubblicità personalizzata.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                3. Durata dei Cookie
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Cookie di Sessione:
                  </h3>
                  <p className="text-secondary/80">
                    Vengono eliminati automaticamente quando chiudi il browser.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-medium text-secondary mb-2">
                    Cookie Permanenti:
                  </h3>
                  <p className="text-secondary/80">
                    Rimangono sul tuo dispositivo per un periodo specificato o fino a quando non li elimini manualmente.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                4. Gestione dei Cookie
              </h2>
              <p className="text-secondary/80 mb-4">
                Puoi controllare e gestire i cookie in diversi modi:
              </p>
              <ul className="list-disc list-inside text-secondary/80 space-y-2">
                <li><strong>Impostazioni del Browser:</strong> La maggior parte dei browser permette di bloccare o eliminare i cookie</li>
                <li><strong>Preferenze del Sito:</strong> Eventuali strumenti di consenso presenti sul sito possono permetterti di aggiornare le tue scelte</li>
                <li><strong>Strumenti di Terze Parti:</strong> Puoi utilizzare estensioni come uBlock Origin o Privacy Badger</li>
              </ul>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4">
                <p className="text-secondary/70 text-sm">
                  <strong>Nota:</strong> Disabilitare alcuni cookie potrebbe influire sulla funzionalità del sito e sulla tua esperienza utente.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                5. Cookie di Terze Parti
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Alcuni cookie tecnici possono essere associati a fornitori essenziali per autenticazione, sicurezza o infrastruttura della piattaforma. Non abbiamo sempre controllo diretto su questi cookie; per maggiori dettagli puoi consultare le informative dei rispettivi fornitori quando applicabile.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secondary mb-4">
                6. Aggiornamenti alla Cookie Policy
              </h2>
              <p className="text-secondary/80 leading-relaxed">
                Possiamo aggiornare questa Cookie Policy di tanto in tanto per riflettere cambiamenti nei nostri servizi o nelle normative. Ti consigliamo di controllare periodicamente questa pagina.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}