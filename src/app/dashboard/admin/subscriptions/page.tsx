"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Euro } from "lucide-react";
import Link from "next/link";

type Subscription = {
  id: string;
  name: string;
  price: number;
  billing: string;
  benefits: string[];
  order_index: number;
  active: boolean;
};

type FormData = {
  name: string;
  price: number;
  billing: string;
  benefits: string[];
  order_index: number;
  active: boolean;
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [benefitInput, setBenefitInput] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    price: 0,
    billing: "",
    benefits: [],
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      const response = await fetch("/api/subscriptions?all=true");
      const data = await response.json();
      setSubscriptions(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(subscription: Subscription) {
    setEditingId(subscription.id);
    setFormData({
      name: subscription.name,
      price: subscription.price,
      billing: subscription.billing,
      benefits: subscription.benefits,
      order_index: subscription.order_index,
      active: subscription.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      name: "",
      price: 0,
      billing: "",
      benefits: [],
      order_index: subscriptions.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    setShowForm(false);
    setBenefitInput("");
    setFormData({
      name: "",
      price: 0,
      billing: "",
      benefits: [],
      order_index: 0,
      active: true,
    });
  }

  function addBenefit() {
    if (benefitInput.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, benefitInput.trim()],
      });
      setBenefitInput("");
    }
  }

  function removeBenefit(index: number) {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const response = await fetch("/api/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...formData }),
        });

        if (!response.ok) throw new Error("Failed to update");
      } else {
        // Create new
        const response = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to create");
      }

      await loadSubscriptions();
      handleCancel();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nel salvataggio dell'abbonamento");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo abbonamento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/subscriptions?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await loadSubscriptions();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nell'eliminazione dell'abbonamento");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] text-white p-6">
        <div className="mx-auto max-w-4xl">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] text-white p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 hover:bg-[#1a3d5c]/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Gestione Abbonamenti</h1>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
          >
            <Plus className="h-4 w-4" />
            Nuovo Abbonamento
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Modifica Abbonamento" : "Nuovo Abbonamento"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Mensile"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Prezzo (€)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                    placeholder="49"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Periodo</label>
                  <input
                    type="text"
                    value={formData.billing}
                    onChange={(e) => setFormData({ ...formData, billing: e.target.value })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                    placeholder="al mese"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Benefici</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                    className="flex-1 rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                    placeholder="Aggiungi un beneficio..."
                  />
                  <button
                    onClick={addBenefit}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
                  >
                    Aggiungi
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2"
                    >
                      <span className="text-sm">{benefit}</span>
                      <button
                        onClick={() => removeBenefit(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ordine</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Stato</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 rounded border-[#2f7de1]/30"
                    />
                    <span className="text-sm">Attivo</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2f7de1]/30 px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3d5c]/60 transition"
                >
                  <X className="h-4 w-4" />
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions List */}
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
              <p className="text-muted">Nessun abbonamento presente.</p>
            </div>
          ) : (
            subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white text-lg">{subscription.name}</h3>
                      {!subscription.active && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          Non attivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-accent">€{subscription.price}</span>
                      <span className="text-sm text-muted">{subscription.billing}</span>
                    </div>
                    <ul className="text-sm text-muted space-y-1">
                      {subscription.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-accent">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(subscription)}
                      className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition"
                    >
                      <Edit2 className="h-4 w-4 text-accent" />
                    </button>
                    <button
                      onClick={() => handleDelete(subscription.id)}
                      className="rounded-lg border border-red-500/30 bg-[#021627] p-2 hover:bg-red-500/20 transition"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
