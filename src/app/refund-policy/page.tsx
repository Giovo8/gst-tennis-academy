import { Metadata } from 'next'
import { RotateCcw, Mail, Phone, MapPin, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politica di Rimborso | GST Tennis Academy',
  description: 'Politica di rimborso e cancellazione prenotazioni - GST Tennis Academy',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <RotateCcw className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Politica di Rimborso
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Scopri le condizioni per cancellazioni e rimborsi delle tue prenotazioni
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
                1. Politica Generale di Rimborso
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                GST Tennis Academy offre rimborsi in conformità con le seguenti condizioni. La nostra politica è progettata per essere equa sia per i clienti che per l'accademia, garantendo al contempo la disponibilità dei campi per tutti gli utenti.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Prenotazioni Campi da Tennis
              </h2>
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Clock className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                      Cancellazione con 48+ ore di anticipo
                    </h3>
                  </div>
                  <p className="text-green-800 dark:text-green-200">
                    <strong>Rimborso completo:</strong> 100% del pagamento rimborsato entro 5-7 giorni lavorativi.
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Clock className="w-6 h-6 text-yellow-600 mr-3" />
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                      Cancellazione con 24-48 ore di anticipo
                    </h3>
                  </div>
                  <p className="text-yellow-800 dark:text-yellow-200">
                    <strong>Rimborso parziale:</strong> 50% del pagamento rimborsato. L'altra metà viene trattenuta come penale di cancellazione.
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Clock className="w-6 h-6 text-red-600 mr-3" />
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                      Cancellazione con meno di 24 ore di anticipo
                    </h3>
                  </div>
                  <p className="text-red-800 dark:text-red-200">
                    <strong>Nessun rimborso:</strong> Il pagamento completo viene trattenuto. La prenotazione può essere trasferita a un'altra persona con il consenso dell'accademia.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Iscrizioni Corsi e Lezioni
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Corsi di Gruppo:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Cancellazione fino a 7 giorni prima dell'inizio: rimborso completo</li>
                    <li>Cancellazione 3-7 giorni prima: rimborso 50%</li>
                    <li>Cancellazione meno di 3 giorni prima: nessun rimborso</li>
                    <li>Lezioni perse per motivi personali: non rimborsabili</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Lezioni Private:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    <li>Cancellazione 24 ore prima: rimborso completo</li>
                    <li>Cancellazione con meno di 24 ore: rimborso 50%</li>
                    <li>No-show senza preavviso: nessun rimborso</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Iscrizioni Tornei
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Le iscrizioni ai tornei sono generalmente non rimborsabili, salvo nei seguenti casi:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                  <li><strong>Cancellazione del torneo:</strong> Rimborso completo se l'accademia annulla l'evento</li>
                  <li><strong>Problemi medici certificati:</strong> Rimborso parziale (50-75%) con documentazione medica</li>
                  <li><strong>Forza maggiore:</strong> Valutazione caso per caso (terremoti, alluvioni, etc.)</li>
                  <li><strong>Trasferimento iscrizione:</strong> Possibile trasferire l'iscrizione a un'altra persona con supplemento amministrativo</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Cancellazioni da Parte dell'Accademia
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Se siamo costretti a cancellare una prenotazione, corso o torneo per motivi indipendenti dalla nostra volontà (condizioni meteorologiche avverse, manutenzione urgente, problemi tecnici, etc.), offriremo:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li>Rimborso completo del pagamento</li>
                <li>Riprenotazione gratuita alla prima data disponibile</li>
                <li>Credito utilizzabile per servizi futuri</li>
                <li>Comunicazione tempestiva via email e app</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Come Richiedere un Rimborso
              </h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  Procedura di Rimborso:
                </h3>
                <ol className="list-decimal list-inside text-blue-800 dark:text-blue-200 space-y-2">
                  <li>Accedi al tuo account GST Tennis Academy</li>
                  <li>Vai alla sezione "Le mie prenotazioni"</li>
                  <li>Seleziona la prenotazione da cancellare</li>
                  <li>Clicca "Richiedi cancellazione" e segui le istruzioni</li>
                  <li>Riceverai una conferma via email entro 24 ore</li>
                  <li>I rimborsi vengono elaborati entro 5-7 giorni lavorativi</li>
                </ol>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Per richieste speciali o casi particolari, contatta il nostro servizio clienti direttamente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Metodi di Rimborso
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                I rimborsi vengono effettuati utilizzando lo stesso metodo di pagamento originale:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                <li><strong>Carte di credito/debito:</strong> 5-7 giorni lavorativi</li>
                <li><strong>PayPal:</strong> 1-3 giorni lavorativi</li>
                <li><strong>Bonifico bancario:</strong> 7-10 giorni lavorativi</li>
                <li><strong>Credito account:</strong> Immediato (utilizzabile per nuove prenotazioni)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Eccezioni e Casi Speciali
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                In casi eccezionali (gravi problemi medici, emergenze familiari, etc.), possiamo offrire rimborsi flessibili. Ogni richiesta viene valutata individualmente con presentazione di documentazione appropriata.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Contatti per Rimborsi
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Per domande sui rimborsi o richieste speciali:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-300">rimborsi@gsttennis.com</span>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  <strong>Orari:</strong> Lun-Ven 9:00-18:00, Sab 9:00-13:00
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}