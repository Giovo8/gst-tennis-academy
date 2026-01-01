"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  CreditCard,
  Calendar,
  Check,
  Star,
  Zap,
  Crown,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Subscription {
  user_id: string;
  plan: string;
  weekly_credits: number;
  credits_available: number;
  last_reset: string;
}

const PLANS = [
  {
    id: "monosettimanale",
    name: "Monosettimanale",
    price: 60,
    period: "mese",
    credits: 1,
    icon: Zap,
    color: "from-sky-500 to-cyan-500",
    features: [
      "1 lezione di gruppo a settimana",
      "Accesso al calendario prenotazioni",
      "Video analisi base",
    ],
  },
  {
    id: "bisettimanale",
    name: "Bisettimanale",
    price: 100,
    period: "mese",
    credits: 2,
    icon: Star,
    color: "from-cyan-500 to-teal-500",
    popular: true,
    features: [
      "2 lezioni di gruppo a settimana",
      "Accesso al calendario prenotazioni",
      "Video analisi avanzata",
      "Sconto 10% shop",
    ],
  },
  {
    id: "trisettimanale",
    name: "Trisettimanale",
    price: 140,
    period: "mese",
    credits: 3,
    icon: Crown,
    color: "from-teal-500 to-emerald-500",
    features: [
      "3 lezioni di gruppo a settimana",
      "Accesso prioritario prenotazioni",
      "Video analisi completa",
      "Sconto 15% shop",
      "Accesso tornei interni",
    ],
  },
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("subscription_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setSubscription(data);
    }

    setLoading(false);
  }

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    
    // Simulate API call - in production this would connect to Stripe
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const plan = PLANS.find(p => p.id === planId);
    if (plan) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("subscription_credits")
          .upsert({
            user_id: user.id,
            plan: plan.name,
            weekly_credits: plan.credits,
            credits_available: plan.credits,
            last_reset: new Date().toISOString(),
          });
        
        await loadSubscription();
      }
    }

    setUpgrading(null);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getNextReset() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Abbonamento</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Gestisci il tuo piano e i crediti settimanali
        </p>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Piano attuale</p>
              <h2 className="text-2xl font-bold">{subscription.plan}</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{subscription.credits_available}</p>
                <p className="text-white/80 text-sm">
                  crediti di {subscription.weekly_credits}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Prossimo reset: {getNextReset()}
              </span>
            </div>
            {subscription.last_reset && (
              <p className="text-sm text-white/60">
                Ultimo reset: {formatDate(subscription.last_reset)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Credits Progress */}
      {subscription && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">
            Utilizzo Crediti Settimanali
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--foreground-muted)]">Crediti utilizzati</span>
              <span className="font-medium text-[var(--foreground)]">
                {subscription.weekly_credits - subscription.credits_available} / {subscription.weekly_credits}
              </span>
            </div>
            <div className="h-3 bg-[var(--surface-hover)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] rounded-full transition-all duration-500"
                style={{
                  width: `${((subscription.weekly_credits - subscription.credits_available) / subscription.weekly_credits) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--foreground-muted)]">
              {subscription.credits_available > 0
                ? `Hai ancora ${subscription.credits_available} ${subscription.credits_available === 1 ? "lezione disponibile" : "lezioni disponibili"} questa settimana`
                : "Hai utilizzato tutti i crediti di questa settimana"}
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          {subscription ? "Cambia Piano" : "Scegli il tuo Piano"}
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription?.plan === plan.name;

            return (
              <div
                key={plan.id}
                className={`relative bg-[var(--surface)] rounded-2xl border-2 overflow-hidden transition-all ${
                  isCurrentPlan
                    ? "border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
                    : plan.popular
                    ? "border-[var(--primary)]/30"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPOLARE
                  </div>
                )}

                <div className={`h-2 bg-gradient-to-r ${plan.color}`} />

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)]">{plan.name}</h4>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        {plan.credits} {plan.credits === 1 ? "lezione" : "lezioni"}/settimana
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-[var(--foreground)]">€{plan.price}</span>
                    <span className="text-[var(--foreground-muted)]">/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-[var(--foreground-muted)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan || upgrading === plan.id}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                      isCurrentPlan
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default"
                        : "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                    } disabled:opacity-50`}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Elaborazione...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <Check className="h-5 w-5" />
                        Piano Attuale
                      </>
                    ) : (
                      <>
                        Scegli Piano
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold text-[var(--foreground)] mb-4">Domande Frequenti</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-[var(--foreground)]">Quando si rinnovano i crediti?</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              I crediti si rinnovano automaticamente ogni lunedì mattina alle 00:00.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">Posso accumulare crediti non usati?</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              No, i crediti non utilizzati scadono alla fine della settimana e non sono cumulabili.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">Come posso disdire l&apos;abbonamento?</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Puoi disdire in qualsiasi momento contattando la segreteria. Il piano rimarrà attivo fino alla fine del periodo pagato.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
