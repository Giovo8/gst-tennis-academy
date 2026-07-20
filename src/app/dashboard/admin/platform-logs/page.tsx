"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  User,
  Calendar,
  Trophy,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Ticket,
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

export default function PlatformLogsPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [limit, setLimit] = useState(200);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/activity-logs?limit=${limit}`);
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "Failed to fetch activity logs");
        }

        setActivityLogs(json.logs || []);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [limit]);

  const filteredActivityLogs = activityLogs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(activityLogs.map((log) => log.action)));

  const getActionIcon = (action: string) => {
    if (action.includes("user")) return <User className="w-5 h-5 text-purple-500" />;
    if (action.includes("booking")) return <Calendar className="w-5 h-5 text-green-500" />;
    if (action.includes("tournament")) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (action.includes("invite_code")) return <Ticket className="w-5 h-5 text-purple-500" />;
    return <Activity className="w-5 h-5 text-secondary" />;
  };

  return (
    <div className="space-y-6 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="breadcrumb text-secondary/60">Log Piattaforma</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">Log Piattaforma</h1>
          <p className="text-secondary/70 font-medium">Tutte le operazioni effettuate dagli utenti</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per azione, utente, email o tipo entità..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
        >
          <option value="all">Tutte le azioni</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
        >
          <option value={50}>Ultimi 50</option>
          <option value={100}>Ultimi 100</option>
          <option value={200}>Ultimi 200</option>
          <option value={500}>Ultimi 500</option>
          <option value={1000}>Ultimi 1000</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento log...</p>
        </div>
      ) : filteredActivityLogs.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Activity className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun log trovato</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[900px]">
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_160px_100px_160px_200px_150px_40px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase">Azione</div>
                <div className="text-xs font-bold text-white/80 uppercase">Tipo</div>
                <div className="text-xs font-bold text-white/80 uppercase">Utente</div>
                <div className="text-xs font-bold text-white/80 uppercase">Email</div>
                <div className="text-xs font-bold text-white/80 uppercase">Data e Ora</div>
                <div></div>
              </div>
            </div>

            {filteredActivityLogs.map((log) => {
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
                  className="bg-white rounded-lg px-4 py-3 hover:shadow-sm transition-all block cursor-pointer border-l-4 border border-black/10 hover:border-gray-300"
                  style={borderStyle}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="grid grid-cols-[40px_160px_100px_160px_200px_150px_40px] items-center gap-4">
                    <div className="flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="font-semibold text-secondary text-sm truncate">{log.action}</div>
                    <div>
                      {log.entity_type && (
                        <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded truncate block">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-secondary/80 truncate">
                      {log.profiles?.full_name || "Utente sconosciuto"}
                    </div>
                    <div className="text-sm text-secondary/70 truncate">
                      {log.profiles?.email || "-"}
                    </div>
                    <div className="text-sm text-secondary/80">{new Date(log.created_at).toLocaleString("it-IT")}</div>
                    <div className="flex justify-center">
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
        </div>
      )}
    </div>
  );
}
