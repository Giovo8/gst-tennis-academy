import { Metadata } from 'next'
import { Cookie, Settings, Mail, Phone, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy | GST Tennis Academy',
  description: 'Informativa sui cookie utilizzati dal sito - GST Tennis Academy',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <Cookie className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Scopri come utilizziamo i cookie per migliorare la tua esperienza sul nostro sito
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
                1. Cosa Sono i Cookie
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                I cookie sono piccoli file di testo che vengono salvati sul tuo dispositivo quando visiti un sito web. Ci aiutano a fornire e migliorare i nostri servizi, personalizzare la tua esperienza e analizzare l'utilizzo del sito.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Tipi di Cookie che Utilizziamo
              </h2>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Cookie Essenziali
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 mb-3">
                    Questi cookie sono necessari per il funzionamento del sito e non possono essere disattivati.
                  </p>
                  <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1">
                    <li>Autenticazione e sicurezza della sessione</li>
                    <li>Gestione delle prenotazioni e dello stato del carrello</li>
                    <li>Ricordo delle preferenze di lingua e regione</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                    Cookie di Performance
                  </h3>
                  <p className="text-green-800 dark:text-green-200 mb-3">
                    Ci aiutano a capire come gli utenti interagiscono con il sito per migliorare le prestazioni.
                  </p>
                  <ul className="list-disc list-inside text-green-800 dark:text-green-200 space-y-1">
                    <li>Google Analytics (anonimizzato)</li>
                    <li>Tempo di caricamento delle pagine</li>
                    <li>Errori e problemi tecnici</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                    Cookie Funzionali
                  </h3>
                  <p className="text-purple-800 dark:text-purple-200 mb-3">
                    Migliorano la funzionalità e personalizzazione del sito.
                  </p>
                  <ul className="list-disc list-inside text-purple-800 dark:text-purple-200 space-y-1">
                    <li>Ricordo delle preferenze di visualizzazione</li>
                    <li>Impostazioni del tema (chiaro/scuro)</li>
                    <li>Posizione nel calendario delle prenotazioni</li>
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-3">
                    Cookie di Marketing
                  </h3>
                  <p className="text-orange-800 dark:text-orange-200 mb-3">
                    Utilizzati per mostrarti annunci rilevanti e misurare l'efficacia delle campagne pubblicitarie.
                  </p>
                  <ul className="list-disc list-inside text-orange-800 dark:text-orange-200 space-y-1">
                    <li>Facebook Pixel</li>
                    <li>Google Ads conversion tracking</li>
                    <li>Retargeting personalizzato</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Durata dei Cookie
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Cookie di Sessione:
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Vengono eliminati automaticamente quando chiudi il browser.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Cookie Permanenti:
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Rimangono sul tuo dispositivo per un periodo specificato o fino a quando non li elimini manualmente.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Gestione dei Cookie
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Puoi controllare e gestire i cookie in diversi modi:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Impostazioni del Browser:</strong> La maggior parte dei browser permette di bloccare o eliminare i cookie</li>
                <li><strong>Il nostro Banner:</strong> Puoi modificare le tue preferenze utilizzando il banner dei cookie</li>
                <li><strong>Strumenti di Terze Parti:</strong> Puoi utilizzare estensioni come uBlock Origin o Privacy Badger</li>
              </ul>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mt-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <strong>Nota:</strong> Disabilitare alcuni cookie potrebbe influire sulla funzionalità del sito e sulla tua esperienza utente.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Cookie di Terze Parti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Alcuni cookie sono impostati da servizi di terze parti che appaiono sulle nostre pagine. Non abbiamo controllo diretto su questi cookie. Per maggiori informazioni, consulta le privacy policy dei rispettivi servizi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Aggiornamenti alla Cookie Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Possiamo aggiornare questa Cookie Policy di tanto in tanto per riflettere cambiamenti nei nostri servizi o nelle normative. Ti consigliamo di controllare periodicamente questa pagina.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Contatti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Per domande sui cookie o per esercitare i tuoi diritti, contattaci:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-300">privacy@gsttennis.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-300">+39 123 456 7890</span>
                  </div>
                  <div className="flex items-center space-x-3 md:col-span-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
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