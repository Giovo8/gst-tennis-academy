"use client";

import { useEffect, useState } from "react";
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
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(50);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        if (logType === "activity") {
          const response = await fetch(`/api/activity-logs?limit=${limit}`);
          const json = await response.json();

          if (!response.ok) {
            throw new Error(json.error || "Failed to fetch activity logs");
          }

          setActivityLogs(json.logs || []);
        } else {
          const response = await fetch(`/api/email-logs?limit=${limit}`);
          const json = await response.json();

          if (!response.ok) {
            throw new Error(json.error || "Failed to fetch email logs");
          }

          setEmailLogs(json.logs || []);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [logType, limit]);

  // Filter logs
  const filteredActivityLogs = activityLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const filteredEmailLogs = emailLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      log.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      log.template_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get unique actions and statuses
  const uniqueActions = Array.from(new Set(activityLogs.map((log) => log.action)));
  const uniqueStatuses = Array.from(new Set(emailLogs.map((log) => log.status)));

  // Helper functions
  const getActionIcon = (action: string) => {
    if (action.includes("email")) return <Mail className="w-5 h-5 text-blue-500" />;
    if (action.includes("user")) return <User className="w-5 h-5 text-purple-500" />;
    if (action.includes("booking")) return <Calendar className="w-5 h-5 text-green-500" />;
    if (action.includes("tournament")) return <Trophy className="w-5 h-5 text-yellow-500" />;
    return <Activity className="w-5 h-5 text-secondary" />;
  };

  const getStatusIcon = (status: string) => {
    if (status === "delivered") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "failed" || status === "bounced") return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === "pending") return <Clock className="w-5 h-5 text-amber-500" />;
    return <AlertCircle className="w-5 h-5 text-secondary" />;
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "delivered") return "bg-green-50 text-green-700 border-green-200";
    if (status === "failed" || status === "bounced") return "bg-red-50 text-red-700 border-red-200";
    if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-secondary/10 text-secondary border-secondary/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Log Piattaforma</h1>
          <p className="text-secondary/70 font-medium">
            Monitora le attività della piattaforma e i log delle email inviate
          </p>
        </div>
      </div>

      {/* Type Selector e Filtri */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLogType("activity");
              setSearch("");
              setActionFilter("all");
            }}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
              logType === "activity"
                ? "text-white bg-secondary"
                : "text-secondary/70 bg-white hover:bg-secondary/5"
            }`}
          >
            <Activity className="h-4 w-4" /> Log Attività
          </button>
          <button
            onClick={() => {
              setLogType("email");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
              logType === "email"
                ? "text-white bg-secondary"
                : "text-secondary/70 bg-white hover:bg-secondary/5"
            }`}
          >
            <Mail className="h-4 w-4" /> Log Email
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder={logType === "activity" ? "Cerca per azione, utente o email..." : "Cerca per destinatario, oggetto o template..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Filtri */}
        {logType === "activity" ? (
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="all">Tutte le azioni</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        ) : (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="all">Tutti gli stati</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        )}
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        >
          <option value={50}>Ultimi 50</option>
          <option value={100}>Ultimi 100</option>
          <option value={200}>Ultimi 200</option>
          <option value={500}>Ultimi 500</option>
        </select>
      </div>

      {/* Lista Log */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento log...</p>
        </div>
      ) : logType === "activity" ? (
        filteredActivityLogs.length === 0 ? (
          <div className="text-center py-20 rounded-md bg-white">
            <Activity className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessun log trovato</h3>
            <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header Row */}
            <div className="bg-white rounded-lg px-5 py-3 mb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Azione</div>
                </div>
                <div className="w-32 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Tipo</div>
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Utente</div>
                </div>
                <div className="w-56 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                </div>
                <div className="w-44 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Data e Ora</div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredActivityLogs.map((log) => {
              // Colore bordo sinistro come bookings: verde, rosso, amber
              let borderStyle = {};
              if (log.action.includes("delete") || log.action.includes("fail")) {
                borderStyle = { borderLeftColor: "#ef4444" };
              } else if (log.action.includes("update") || log.action.includes("edit")) {
                borderStyle = { borderLeftColor: "#f59e0b" };
              } else {
                borderStyle = { borderLeftColor: "#10b981" };
              }
              return (
                <div
                  key={log.id}
                  className="bg-white rounded-md p-5 hover:shadow-md transition-all block cursor-pointer border-l-4"
                  style={borderStyle}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="w-48 flex-shrink-0">
                      <div className="font-semibold text-secondary truncate">{log.action}</div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      {log.entity_type && (
                        <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded truncate block">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm text-secondary/80 truncate">
                        {log.profiles?.full_name || "Utente sconosciuto"}
                      </div>
                    </div>
                    <div className="w-56 flex-shrink-0">
                      <div className="text-sm text-secondary/70 truncate">
                        {log.profiles?.email || "-"}
                      </div>
                    </div>
                    <div className="w-44 flex-shrink-0">
                      <div className="text-sm text-secondary/80">{new Date(log.created_at).toLocaleString("it-IT")}</div>
                    </div>
                    <div className="ml-auto">
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
                            <span className="ml-2 text-secondary/60 font-mono text-xs">{log.entity_id}</span>
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
                            <pre className="bg-secondary/5 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredEmailLogs.length === 0 ? (
          <div className="text-center py-20 rounded-md bg-white">
            <Mail className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessun log email trovato</h3>
            <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header Row */}
            <div className="bg-white rounded-lg px-5 py-3 mb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                </div>
                <div className="w-64 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Oggetto</div>
                </div>
                <div className="w-40 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Template</div>
                </div>
                <div className="w-56 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Destinatario</div>
                </div>
                <div className="w-44 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Data e Ora</div>
                </div>
                <div className="w-32 flex-shrink-0">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Stato</div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredEmailLogs.map((log) => {
              let borderStyle = {};
              if (log.status === "failed" || log.status === "bounced") {
                borderStyle = { borderLeftColor: "#ef4444" };
              } else if (log.status === "pending") {
                borderStyle = { borderLeftColor: "#f59e0b" };
              } else {
                borderStyle = { borderLeftColor: "#10b981" };
              }
              return (
                <div
                  key={log.id}
                  className="bg-white rounded-md p-5 hover:shadow-md transition-all block cursor-pointer border-l-4"
                  style={borderStyle}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {getStatusIcon(log.status)}
                    </div>
                    <div className="w-64 flex-shrink-0">
                      <div className="font-semibold text-secondary truncate">{log.subject}</div>
                    </div>
                    <div className="w-40 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded truncate block">{log.template_name}</span>
                    </div>
                    <div className="w-56 flex-shrink-0">
                      <div className="text-sm text-secondary/80 truncate">
                        {log.recipient_email}
                      </div>
                    </div>
                    <div className="w-44 flex-shrink-0">
                      <div className="text-sm text-secondary/80">{new Date(log.created_at).toLocaleString("it-IT")}</div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeColor(log.status)}`}>{log.status}</span>
                    </div>
                    <div className="ml-auto">
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
                            <span className="ml-2 text-secondary/60">{new Date(log.sent_at).toLocaleString("it-IT")}</span>
                          </div>
                        )}
                        {log.delivered_at && (
                          <div>
                            <span className="font-medium text-secondary">Consegnata:</span>
                            <span className="ml-2 text-secondary/60">{new Date(log.delivered_at).toLocaleString("it-IT")}</span>
                          </div>
                        )}
                        {log.failed_at && (
                          <div>
                            <span className="font-medium text-secondary">Fallita:</span>
                            <span className="ml-2 text-secondary/60">{new Date(log.failed_at).toLocaleString("it-IT")}</span>
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
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
