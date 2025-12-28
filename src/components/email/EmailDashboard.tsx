"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  RefreshCw,
  Filter,
  Search,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  template_name: string;
  status: string;
  sent_at: string;
  delivered_at: string;
  opened_at: string;
  clicked_at: string;
  error_message: string;
  retry_count: number;
  created_at: string;
}

interface EmailStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

export default function EmailDashboard() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load email logs
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // Date range filter
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      query = query.gte("created_at", daysAgo.toISOString());

      const { data: logsData } = await query;
      setLogs(logsData || []);

      // Load stats
      const { data: statsData } = await supabase.rpc("get_email_stats", {
        start_date: daysAgo.toISOString(),
        end_date: new Date().toISOString(),
      });

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error) {
      console.error("Error loading email data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function retryEmail(emailId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/email/scheduler?action=retry_failed&secret=" + process.env.NEXT_PUBLIC_CRON_SECRET, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error retrying email:", error);
    }
  }

  const statusColors: Record<string, string> = {
    sent: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    opened: "bg-purple-100 text-purple-800",
    clicked: "bg-pink-100 text-pink-800",
    failed: "bg-red-100 text-red-800",
    bounced: "bg-orange-100 text-orange-800",
    pending: "bg-gray-100 text-gray-800",
  };

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesSearch =
      searchTerm === "" ||
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestione e monitoraggio email GST Tennis Academy
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inviate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_sent}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500 font-semibold">{stats.delivery_rate}%</span>
              <span className="text-gray-500">consegnate</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Consegnate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_delivered}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-gray-500">
                {stats.total_failed} fallite
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aperte</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_opened}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-purple-500 font-semibold">{stats.open_rate}%</span>
              <span className="text-gray-500">tasso apertura</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_clicked}
                </p>
              </div>
              <div className="bg-pink-100 p-3 rounded-lg">
                <MousePointer className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-pink-500 font-semibold">{stats.click_rate}%</span>
              <span className="text-gray-500">tasso click</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-2" />
              Stato
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tutti</option>
              <option value="sent">Inviate</option>
              <option value="delivered">Consegnate</option>
              <option value="opened">Aperte</option>
              <option value="clicked">Cliccate</option>
              <option value="failed">Fallite</option>
              <option value="bounced">Respinte</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Periodo
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Oggi</option>
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Cerca
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Email o oggetto..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Email Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Destinatario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Oggetto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nessuna email trovata
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.recipient_name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">{log.recipient_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {log.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {log.template_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[log.status] || statusColors.pending
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.retry_count > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          (retry: {log.retry_count})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(log.sent_at || log.created_at).toLocaleDateString("it-IT")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.sent_at || log.created_at).toLocaleTimeString("it-IT")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "failed" && log.retry_count < 3 && (
                        <button
                          onClick={() => retryEmail(log.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Riprova
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
