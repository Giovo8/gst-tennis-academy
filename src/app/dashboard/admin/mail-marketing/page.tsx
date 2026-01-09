"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Send, Users, Target, BarChart3, TrendingUp, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type EmailTemplate = "welcome" | "tournament_invite" | "course_reminder" | "news" | "promotion" | "custom";

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

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function MailMarketingPage() {
  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error loading campaigns:", error);
        return;
      }

      setCampaigns(data || []);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              GESTIONE MAIL MARKETING
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Mail Marketing
            </h1>
            <p className="text-gray-600 text-sm mt-1 max-w-2xl">
              Invia campagne email ai tuoi utenti e monitora le performance
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/admin/mail-marketing/send"
          className="px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center gap-2"
        >
          <Send className="h-5 w-5" />
          <span>Invia Email</span>
        </Link>
      </div>

      {/* Cronologia Email Inviate */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Cronologia Email Inviate</h2>
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center border border-gray-200 rounded-xl">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna campagna</h3>
              <p className="text-gray-600">
                Le tue campagne email appariranno qui dopo l'invio
              </p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border-l-4 border-secondary shadow-md p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-secondary mb-1">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 mb-2"><strong>Oggetto:</strong> {campaign.subject}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{campaign.content}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
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

                <div className="flex items-center gap-6 text-sm text-gray-600 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span><strong>{campaign.recipient_count}</strong> destinatari</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(campaign.sent_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
