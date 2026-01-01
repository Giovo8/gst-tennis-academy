import { Metadata } from 'next'
import { Accessibility, Eye, Keyboard, Volume2, Mail, Phone, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Accessibilità | GST Tennis Academy',
  description: 'Impegno per l\'accessibilità digitale e inclusione - GST Tennis Academy',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <Accessibility className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Accessibilità
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Il nostro impegno per rendere GST Tennis Academy accessibile a tutti
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
                1. Il Nostro Impegno
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                GST Tennis Academy si impegna a rendere i suoi servizi digitali accessibili a tutti gli utenti, indipendentemente dalle loro capacità fisiche, cognitive o tecnologiche. Seguiamo le linee guida WCAG 2.1 (Web Content Accessibility Guidelines) al livello AA.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Caratteristiche di Accessibilità
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Eye className="w-6 h-6 text-blue-600 mr-3" />
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Accessibilità Visiva
                    </h3>
                  </div>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                    <li>Alto contrasto di colori</li>
                    <li>Testo ridimensionabile</li>
                    <li>Supporto per screen reader</li>
                    <li>Modalità scura</li>
                    <li>Icone con testo alternativo</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Keyboard className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                      Navigazione Tastiera
                    </h3>
                  </div>
                  <ul className="text-green-800 dark:text-green-200 space-y-1">
                    <li>Navigazione completa da tastiera</li>
                    <li>Focus indicators visibili</li>
                    <li>Skip links per sezioni</li>
                    <li>Tasti di scelta rapida</li>
                    <li>Struttura logica del contenuto</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Volume2 className="w-6 h-6 text-purple-600 mr-3" />
                    <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                      Supporto Multimediale
                    </h3>
                  </div>
                  <ul className="text-purple-800 dark:text-purple-200 space-y-1">
                    <li>Sottotitoli per video</li>
                    <li>Trascrizioni testuali</li>
                    <li>Controlli volume indipendenti</li>
                    <li>Descrizioni audio alternative</li>
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <Accessibility className="w-6 h-6 text-orange-600 mr-3" />
                    <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                      Accessibilità Cognitiva
                    </h3>
                  </div>
                  <ul className="text-orange-800 dark:text-orange-200 space-y-1">
                    <li>Linguaggio semplice e chiaro</li>
                    <li>Struttura prevedibile</li>
                    <li>Possibilità di pausa/ferma</li>
                    <li>Contenuto divisibile in sezioni</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Assistive Technologies Supportate
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Il nostro sito è compatibile con le seguenti tecnologie assistive:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Screen Readers</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    NVDA, JAWS, VoiceOver, TalkBack
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Browser</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Chrome, Firefox, Safari, Edge
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Dispositivi</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Desktop, Tablet, Mobile
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Accessibilità Fisica
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Oltre all'accessibilità digitale, ci impegniamo per l'accessibilità fisica delle nostre strutture:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Accesso facilitato:</strong> Rampe, ascensori e ingressi larghi per disabili</li>
                <li><strong>Spogliatoi accessibili:</strong> Docce e servizi igienici adattati</li>
                <li><strong>Parcheggi riservati:</strong> Posti auto per disabili vicino all'ingresso</li>
                <li><strong>Attrezzature speciali:</strong> Sedie a rotelle sportive e ausili per giocatori con disabilità</li>
                <li><strong>Personale formato:</strong> Staff addestrato per assistere giocatori con bisogni speciali</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Feedback e Segnalazioni
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                La tua opinione è importante per noi. Se riscontri difficoltà nell'utilizzare il nostro sito o i nostri servizi, o hai suggerimenti per migliorare l'accessibilità, ti preghiamo di contattarci. Prendiamo sul serio ogni segnalazione e lavoriamo continuamente per migliorare.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Conformità Legale
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Ci impegniamo a rispettare tutte le normative vigenti in materia di accessibilità digitale, inclusa la Direttiva Europea 2016/2102 sull'accessibilità dei siti web e delle applicazioni mobili degli enti pubblici, e le linee guida WCAG 2.1 AA.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Monitoraggio e Miglioramento Continuo
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Effettuiamo regolarmente audit di accessibilità e test con utenti disabili per identificare e risolvere eventuali problemi. Le nostre pratiche di sviluppo includono considerazioni di accessibilità fin dalle fasi iniziali di progettazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Contatti Accessibilità
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Per questioni relative all'accessibilità o per richiedere assistenza:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-300">accessibilita@gsttennis.com</span>
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
                  <strong>Responsabile Accessibilità:</strong> Maria Rossi - Accessibilità Manager
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}