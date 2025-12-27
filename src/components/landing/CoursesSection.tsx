"use client";

export default function CoursesSection() {
  return (
    <section id="programmi" className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
          Corsi e Abbonamenti
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Scegli il tuo percorso tennis
        </h2>
      </div>

      {/* Quota Iscrizione */}
      <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Quota Iscrizione</h3>
            <p className="text-sm text-muted">Comprende lo starter kit Adidas</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-white">150€</span>
          </div>
        </div>
      </div>

      {/* Corso Base */}
      <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">Corso Base</h3>
          <p className="text-sm text-muted">1 ora di tennis - 30 min di prep. fisica</p>
        </div>
        
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Monosettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">100€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">650€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Bisettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">150€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">1000€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Trisettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">180€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">1300€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Corso Avanzato */}
      <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">Corso Avanzato</h3>
          <p className="text-sm text-muted">1 ora e 30 min di tennis - 30 min di prep. fisica</p>
        </div>
        
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Monosettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">135€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">900€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Bisettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">180€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">1350€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-accent mb-2">Trisettimanale</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">220€<span className="text-sm font-normal text-muted"> /mese</span></p>
              <p className="text-lg font-bold text-white">1500€<span className="text-sm font-normal text-muted"> /anno</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Corso Agonistico */}
      <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">Corso Agonistico</h3>
          <div className="space-y-1 text-sm text-muted">
            <p>1 ora e 30 min di tennis</p>
            <p>30 min di prep. fisica o palestra presso il Time Out Sporting Village</p>
            <p className="font-semibold text-accent">5 giorni a settimana</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 inline-block">
          <p className="text-3xl font-bold text-white">2700€<span className="text-lg font-normal text-muted"> /anno</span></p>
        </div>
      </div>

      {/* Extra e Sconti */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Extra */}
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Extra</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Tesseramento Agonistico</span>
              <span className="text-lg font-bold text-white">30€</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Tesseramento Non Agonistico</span>
              <span className="text-lg font-bold text-white">20€</span>
            </div>
          </div>
          <p className="text-xs text-muted mt-4 pt-4 border-t border-white/10">
            <strong>Tesseramento obbligatorio.</strong> Per il tesseramento agonistico è necessario il certificato medico.
            Quando le condizioni meteo saranno avverse il corso agonistico farà 1 ora di palestra 1/2 incontri al mese
            con la psicologa dello sport in base alla programmazione della scuola tennis.
          </p>
        </div>

        {/* Sconti */}
        <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sconti</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">5% Stesso nucleo familiare</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">5% Porta un amico</p>
                <p className="text-xs text-muted">Se presenti un nuovo iscritto</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">5% Pagamento anticipato</p>
                <p className="text-xs text-muted">Saldo quota iscrizione e prima rata entro il 15 settembre (solo annuale)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">10% Pagamento unica soluzione</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-4 pt-4 border-t border-white/10">
            Gli sconti non sono cumulabili tra loro e con altre convenzioni
          </p>
        </div>
      </div>
    </section>
  );
}
