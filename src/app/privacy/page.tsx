import { Metadata } from 'next'
import { Shield, Mail, Phone, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | GST Tennis Academy',
  description: 'Informativa sulla privacy e protezione dei dati personali - GST Tennis Academy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-frozen-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-frozen-600 rounded-full mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            La tua privacy è importante per noi. Scopri come proteggiamo e gestiamo i tuoi dati personali.
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
                1. Introduzione
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                GST Tennis Academy ("noi", "nostro" o "GST") si impegna a proteggere la privacy degli utenti del nostro sito web e dei nostri servizi. Questa Privacy Policy spiega come raccogliamo, utilizziamo, divulghiamo e proteggiamo le informazioni personali degli utenti in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) UE 2016/679.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Dati che Raccogliamo
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Dati forniti direttamente:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Nome e cognome</li>
                    <li>Indirizzo email</li>
                    <li>Numero di telefono</li>
                    <li>Data di nascita</li>
                    <li>Informazioni di pagamento (elaborate in modo sicuro)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Dati raccolti automaticamente:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Indirizzo IP</li>
                    <li>Tipo di browser e versione</li>
                    <li>Pagina di riferimento</li>
                    <li>Tempo di visita e pagine visualizzate</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Come Utilizziamo i Tuoi Dati
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Utilizziamo le informazioni raccolte per:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li>Fornire e gestire i nostri servizi di prenotazione campi e tornei</li>
                <li>Comunicare con te riguardo alle tue prenotazioni e attività</li>
                <li>Migliorare i nostri servizi e l'esperienza utente</li>
                <li>Inviare notifiche importanti relative al tuo account</li>
                <li>Conformarci agli obblighi legali e normativi</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Condivisione dei Dati
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Non vendiamo, noleggiamo o condividiamo le tue informazioni personali con terze parti, eccetto nei seguenti casi:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li>Con il tuo consenso esplicito</li>
                <li>Per fornire i servizi richiesti (es. elaborazione pagamenti)</li>
                <li>Quando richiesto dalla legge o per proteggere i nostri diritti</li>
                <li>Con fornitori di servizi affidabili che rispettano la privacy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Sicurezza dei Dati
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Implementiamo misure di sicurezza tecniche e organizzative appropriate per proteggere i tuoi dati personali contro accessi non autorizzati, alterazioni, divulgazioni o distruzioni. Utilizziamo crittografia SSL/TLS per la trasmissione dei dati e manteniamo sistemi di sicurezza avanzati.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. I Tuoi Diritti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Ai sensi del GDPR, hai i seguenti diritti:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Diritto di accesso:</strong> Richiedere una copia dei tuoi dati personali</li>
                <li><strong>Diritto di rettifica:</strong> Correggere dati inesatti o incompleti</li>
                <li><strong>Diritto alla cancellazione:</strong> Richiedere la cancellazione dei tuoi dati</li>
                <li><strong>Diritto di limitazione:</strong> Limitare il trattamento dei tuoi dati</li>
                <li><strong>Diritto alla portabilità:</strong> Ricevere i tuoi dati in formato strutturato</li>
                <li><strong>Diritto di opposizione:</strong> Opporsi al trattamento dei tuoi dati</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Cookie e Tecnologie Simili
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza sul nostro sito. Per maggiori dettagli, consulta la nostra <a href="/cookie-policy" className="text-frozen-600 hover:text-frozen-800 dark:text-frozen-400 dark:hover:text-frozen-300">Cookie Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Contatti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Per qualsiasi domanda sulla privacy o per esercitare i tuoi diritti, contattaci:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-frozen-600" />
                    <span className="text-gray-700 dark:text-gray-300">privacy@gsttennis.com</span>
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

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Modifiche alla Privacy Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Possiamo aggiornare questa Privacy Policy di tanto in tanto. Ti informeremo di eventuali modifiche significative pubblicandole sul nostro sito web e, se necessario, contattandoti direttamente.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}