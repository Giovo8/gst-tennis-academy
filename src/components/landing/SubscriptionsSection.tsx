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
    <section aria-labelledby="subscriptions-heading" className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 shadow mb-8">
      <div className="max-w-6xl mx-auto">
        <h2 id="subscriptions-heading" className="text-2xl font-bold text-white mb-4">Abbonamenti</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-[#2f7de1]/50 p-4 bg-[#0d1f35]/80">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-white">{plan.name}</h3>
                <div className="text-xl font-bold text-white">€{plan.price}</div>
              </div>
              <p className="mt-2 text-sm text-white/80">{plan.billing}</p>
              <ul className="mt-3 text-sm text-white/80 list-disc list-inside">
                {plan.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className="mt-4">
                <a href="/register" className="inline-block rounded-full bg-[#2f7de1] px-4 py-2 text-sm font-semibold text-white">Sottoscrivi</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
