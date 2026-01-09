"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Activity,
  Mail,
  User,
  Calendar,
  Trophy,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_name: string;
  status: string;
  provider: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
}

type LogType = "activity" | "email";

export default function PlatformLogsPage() {
  const [logType, setLogType] = useState<LogType>("activity");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadLogs();
  }, [logType, limit]);

  async function loadLogs() {
    setLoading(true);

    if (logType === "activity") {
      const { data, error } = await supabase
        .from("activity_log")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setActivityLogs(data);
      }
    } else {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setEmailLogs(data);
      }
    }

    setLoading(false);
  }

  const getActionIcon = (action: string) => {
    if (action.includes("booking")) return <Calendar className="h-4 w-4" />;
    if (action.includes("user") || action.includes("register")) return <User className="h-4 w-4" />;
    if (action.includes("tournament")) return <Trophy className="h-4 w-4" />;
    if (action.includes("email")) return <Mail className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "failed":
      case "bounced":
        return "bg-red-50 text-red-700 border-red-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const filteredActivityLogs = activityLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const filteredEmailLogs = emailLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      log.template_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const uniqueActions = Array.from(new Set(activityLogs.map((log) => log.action)));
  const uniqueStatuses = Array.from(new Set(emailLogs.map((log) => log.status)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Log Piattaforma</h1>
          <p className="text-secondary/60 text-sm mt-1">
            Monitora le attività della piattaforma e i log delle email inviate
          </p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setLogType("activity");
            setSearch("");
            setActionFilter("all");
          }}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            logType === "activity"
              ? "text-white bg-secondary"
              : "bg-white text-secondary/70 hover:bg-secondary/5"
          }`}
        >
          <Activity className="h-4 w-4" />
          Log Attività
        </button>
        <button
          onClick={() => {
            setLogType("email");
            setSearch("");
            setStatusFilter("all");
          }}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            logType === "email"
              ? "text-white bg-secondary"
              : "bg-white text-secondary/70 hover:bg-secondary/5"
          }`}
        >
          <Mail className="h-4 w-4" />
          Log Email
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Type-specific filters */}
        {logType === "activity" ? (
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="all">Tutte le azioni</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="all">Tutti gli stati</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2.5 rounded-lg bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        >
          <option value={50}>Ultimi 50</option>
          <option value={100}>Ultimi 100</option>
          <option value={200}>Ultimi 200</option>
          <option value={500}>Ultimi 500</option>
        </select>
      </div>

      {/* Logs Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-secondary/40 animate-spin" />
          <p className="mt-4 text-secondary/60">Caricamento log...</p>
        </div>
      ) : logType === "activity" ? (
        <div className="space-y-2">
          {filteredActivityLogs.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <Activity className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
              <p className="text-secondary/70">Nessun log trovato</p>
            </div>
          ) : (
            filteredActivityLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg p-4 border border-secondary/10 hover:border-secondary/20 transition-all"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 text-secondary">{getActionIcon(log.action)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-secondary">{log.action}</span>
                        {log.entity_type && (
                          <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded">
                            {log.entity_type}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-secondary/60">
                        {log.profiles?.full_name ? (
                          <>
                            <span className="font-medium">{log.profiles.full_name}</span>
                            {" • "}
                            <span>{log.profiles.email}</span>
                          </>
                        ) : (
                          <span>Utente sconosciuto</span>
                        )}
                        {" • "}
                        <span>{new Date(log.created_at).toLocaleString("it-IT")}</span>
                      </div>
                    </div>
                    {expandedLog === log.id ? (
                      <ChevronUp className="h-5 w-5 text-secondary/40" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-secondary/40" />
                    )}
                  </div>
                </div>

                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t border-secondary/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {log.entity_id && (
                        <div>
                          <span className="font-medium text-secondary">Entity ID:</span>
                          <span className="ml-2 text-secondary/60 font-mono text-xs">
                            {log.entity_id}
                          </span>
                        </div>
                      )}
                      {log.ip_address && (
                        <div>
                          <span className="font-medium text-secondary">IP Address:</span>
                          <span className="ml-2 text-secondary/60">{log.ip_address}</span>
                        </div>
                      )}
                      {log.user_agent && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-secondary">User Agent:</span>
                          <span className="ml-2 text-secondary/60 text-xs">{log.user_agent}</span>
                        </div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-secondary mb-2 block">Metadata:</span>
                          <pre className="bg-secondary/5 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmailLogs.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <Mail className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
              <p className="text-secondary/70">Nessun log email trovato</p>
            </div>
          ) : (
            filteredEmailLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg p-4 border border-secondary/10 hover:border-secondary/20 transition-all"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-secondary">{log.subject}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeColor(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded">
                          {log.template_name}
                        </span>
                      </div>
                      <div className="text-sm text-secondary/60">
                        <span className="font-medium">{log.recipient_email}</span>
                        {log.recipient_name && <span> • {log.recipient_name}</span>}
                        {" • "}
                        <span>{new Date(log.created_at).toLocaleString("it-IT")}</span>
                      </div>
                    </div>
                    {expandedLog === log.id ? (
                      <ChevronUp className="h-5 w-5 text-secondary/40" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-secondary/40" />
                    )}
                  </div>
                </div>

                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t border-secondary/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-secondary">Provider:</span>
                        <span className="ml-2 text-secondary/60">{log.provider}</span>
                      </div>
                      {log.sent_at && (
                        <div>
                          <span className="font-medium text-secondary">Inviata:</span>
                          <span className="ml-2 text-secondary/60">
                            {new Date(log.sent_at).toLocaleString("it-IT")}
                          </span>
                        </div>
                      )}
                      {log.delivered_at && (
                        <div>
                          <span className="font-medium text-secondary">Consegnata:</span>
                          <span className="ml-2 text-secondary/60">
                            {new Date(log.delivered_at).toLocaleString("it-IT")}
                          </span>
                        </div>
                      )}
                      {log.failed_at && (
                        <div>
                          <span className="font-medium text-secondary">Fallita:</span>
                          <span className="ml-2 text-secondary/60">
                            {new Date(log.failed_at).toLocaleString("it-IT")}
                          </span>
                        </div>
                      )}
                      {log.error_message && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-secondary">Errore:</span>
                          <span className="ml-2 text-red-600">{log.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
