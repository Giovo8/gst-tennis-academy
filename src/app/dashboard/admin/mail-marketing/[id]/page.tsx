"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { logActivity } from "@/lib/activity/logActivity";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  content: string;
  template: string | null;
  recipient_type: string;
  recipient_role: string | null;
  recipient_count: number;
  recipient_emails: string[];
  sent_by: string | null;
  sent_at: string;
  status: string;
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  async function loadCampaign() {
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) {
        console.error("Error loading campaign:", error);
        setError("Errore nel caricamento della campagna");
        return;
      }

      setCampaign(data);
    } catch (err) {
      console.error("Error loading campaign:", err);
      setError("Errore nel caricamento della campagna");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign() {
    if (!confirm("Sei sicuro di voler eliminare questa campagna? Questa azione non può essere annullata.")) {
      return;
    }

    setDeleting(true);
    try {
      console.log("🗑️ Attempting to delete campaign:", campaignId);

      const { data, error } = await supabase
        .from("email_campaigns")
        .delete()
        .eq("id", campaignId)
        .select();

      if (error) {
        console.error("❌ Error deleting campaign:", error);
        alert(`Errore durante l'eliminazione della campagna: ${error.message}`);
        setDeleting(false);
        return;
      }

      console.log("✅ Campaign deleted successfully:", data);

      // Log activity
      await logActivity({
        action: "email.campaign.delete",
        entityType: "email_campaign",
        entityId: campaignId,
        metadata: {
          campaignName: campaign?.name,
          recipientCount: campaign?.recipient_count
        }
      });

      // Redirect to mail marketing page
      router.push("/dashboard/admin/mail-marketing");
    } catch (err: any) {
      console.error("❌ Exception deleting campaign:", err);
      alert(`Errore durante l'eliminazione della campagna: ${err.message || String(err)}`);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-secondary/60">Caricamento campagna...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-secondary/60">{error || "Campagna non trovata"}</p>
          <Link
            href="/dashboard/admin/mail-marketing"
            className="mt-4 inline-flex items-center gap-2 text-secondary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/mail-marketing"
              className="hover:text-secondary/80 transition-colors"
            >
              Mail Marketing
            </Link>
            <span className="mx-2">›</span>
            <span>Dettaglio Campagna</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">
            {campaign.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                campaign.status === "sent"
                  ? "bg-green-100 text-green-800"
                  : campaign.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {campaign.status === "sent" ? "Inviata" : campaign.status === "pending" ? "In attesa" : "Fallita"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={deleteCampaign}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            <span>{deleting ? "Eliminazione..." : "Elimina"}</span>
          </button>
          <Link
            href="/dashboard/admin/mail-marketing"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-secondary font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Indietro</span>
          </Link>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Destinatari */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Users className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-secondary/60 font-semibold uppercase tracking-wider">Destinatari</p>
              <p className="text-2xl font-bold text-secondary">{campaign.recipient_count}</p>
            </div>
          </div>
          <p className="text-sm text-secondary/70 mt-2">
            Tipo: <span className="font-medium">{campaign.recipient_type === "all" ? "Tutti" : campaign.recipient_type === "role" ? `Ruolo: ${campaign.recipient_role}` : "Personalizzato"}</span>
          </p>
        </div>

        {/* Data Invio */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-secondary/60 font-semibold uppercase tracking-wider">Data Invio</p>
              <p className="text-lg font-bold text-secondary">
                {format(new Date(campaign.sent_at), "dd MMM yyyy", { locale: it })}
              </p>
            </div>
          </div>
          <p className="text-sm text-secondary/70 mt-2">
            Ora: <span className="font-medium">{format(new Date(campaign.sent_at), "HH:mm", { locale: it })}</span>
          </p>
        </div>

        {/* Template */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Mail className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-secondary/60 font-semibold uppercase tracking-wider">Template</p>
              <p className="text-lg font-bold text-secondary capitalize">
                {campaign.template || "Personalizzato"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-4">Contenuto Email</h2>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-secondary/60 block mb-1">Oggetto</label>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-secondary">{campaign.subject}</p>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-secondary/60 block mb-1">Messaggio</label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-secondary whitespace-pre-wrap">{campaign.content}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-4">
          Lista Destinatari ({campaign.recipient_emails.length})
        </h2>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {campaign.recipient_emails.map((email, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <Mail className="h-4 w-4 text-secondary/60" />
              <span className="text-sm text-secondary">{email}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
