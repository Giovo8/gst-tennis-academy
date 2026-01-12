"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Send, Users, Target, BarChart3, TrendingUp, Calendar, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"name" | "date" | "recipients" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCampaigns();

    // Set up real-time subscription for campaign changes
    const channel = supabase
      .channel('email_campaigns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campaigns'
        },
        (payload) => {
          console.log('Campaign change detected:', payload);
          loadCampaigns();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleSort = (column: "name" | "date" | "recipients" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      !search ||
      campaign.name?.toLowerCase().includes(search.toLowerCase()) ||
      campaign.subject?.toLowerCase().includes(search.toLowerCase()) ||
      campaign.status?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "date":
        comparison = new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
        break;
      case "recipients":
        comparison = a.recipient_count - b.recipient_count;
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

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

      {/* Search Bar */}
      <div className="relative flex-1 min-w-[250px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome campagna, oggetto o stato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Cronologia Email Inviate */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna campagna</h3>
            <p className="text-gray-600">
              Le tue campagne email appariranno qui dopo l'invio
            </p>
          </div>
        ) : (
          <>
            {/* Header Row */}
            <div className="bg-white rounded-lg px-5 py-3">
              <div className="flex items-center gap-4">
                <div className="w-64 flex-shrink-0">
                  <button
                    onClick={() => handleSort("name")}
                    className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                  >
                    Nome Campagna
                    {sortBy === "name" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Oggetto</div>
                </div>
                <div className="w-32 flex-shrink-0">
                  <button
                    onClick={() => handleSort("recipients")}
                    className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                  >
                    Destinatari
                    {sortBy === "recipients" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="w-40 flex-shrink-0">
                  <button
                    onClick={() => handleSort("date")}
                    className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                  >
                    Data Invio
                    {sortBy === "date" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="w-28 flex-shrink-0">
                  <button
                    onClick={() => handleSort("status")}
                    className="text-xs font-bold text-secondary/60 uppercase hover:text-secondary transition-colors flex items-center gap-1"
                  >
                    Stato
                    {sortBy === "status" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {sortedCampaigns.map((campaign) => {
              let borderStyle = {};
              if (campaign.status === "sent") {
                borderStyle = { borderLeftColor: "#10b981" }; // green
              } else if (campaign.status === "pending") {
                borderStyle = { borderLeftColor: "#f59e0b" }; // amber
              } else {
                borderStyle = { borderLeftColor: "#ef4444" }; // red
              }

              return (
                <Link
                  key={campaign.id}
                  href={`/dashboard/admin/mail-marketing/${campaign.id}`}
                  className="bg-white rounded-md p-5 hover:shadow-md transition-all border-l-4 block cursor-pointer"
                  style={borderStyle}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-64 flex-shrink-0">
                      <div className="font-semibold text-secondary">{campaign.name}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-secondary/80 truncate">{campaign.subject}</div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-secondary/70">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{campaign.recipient_count}</span>
                      </div>
                    </div>
                    <div className="w-40 flex-shrink-0">
                      <div className="text-sm text-secondary/80">
                        {format(new Date(campaign.sent_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </div>
                    </div>
                    <div className="w-28 flex-shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
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
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
