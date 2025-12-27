"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type Plan = {
  id: string;
  name: string;
  price: number;
  billing: string;
  benefits: string[];
};

const defaultPlans: Plan[] = [
  { id: 'plan_month', name: 'Mensile', price: 49, billing: 'al mese', benefits: ['Accesso campi', 'Sconti sui corsi', 'Priorità iscrizioni'] },
  { id: 'plan_year', name: 'Annuale', price: 499, billing: 'all\'anno', benefits: ['Accesso illimitato', '2 mesi gratis', 'Sconto 15% su tutto'] },
  { id: 'plan_clinic', name: 'Clinic Pack', price: 199, billing: 'pacchetto', benefits: ['10 lezioni', 'Analisi tecnica', 'Video review'] },
];

export default function SubscriptionsSection() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPlans(data);
      }
    } catch (error) {
      console.error("Errore nel caricamento degli abbonamenti:", error);
      // Mantiene i default in caso di errore
    }
  }

  return (
    <section id="subscriptions" className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
          Abbonamenti
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Scegli il piano perfetto per te
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.id} className="flex flex-col rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 transition hover:border-[#2f7de1]/50 hover:bg-[#1a3d5c]/80">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">€{plan.price}</span>
                <span className="text-sm text-muted">{plan.billing}</span>
              </div>
            </div>
            
            <ul className="mb-6 flex-1 space-y-2 text-sm text-muted">
              {plan.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
