"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { Bell, Send, CheckCircle, XCircle } from "lucide-react";

export default function TestNotificationsPage() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("Test Notification");
  const [message, setMessage] = useState("Questa è una notifica di test");
  const [type, setType] = useState<"message" | "tournament" | "announcement" | "booking" | "general">("general");
  const [link, setLink] = useState("/dashboard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setUserId(user.id);
    }
  }

  async function sendTestNotification() {
    if (!userId || !title || !message) {
      setResult({ success: false, message: "Compila tutti i campi" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log("🧪 Sending test notification...");
      
      await createNotification({
        userId,
        type,
        title,
        message,
        link,
      });

      setResult({ success: true, message: "Notifica inviata con successo!" });
      
      // Check if notification was created
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          console.log("✅ Notification found in database:", data[0]);
        } else {
          console.log("⚠️ Notification not found in database", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error("❌ Error:", error);
      setResult({ success: false, message: "Errore durante l'invio" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Bell className="h-6 w-6 text-secondary" />
          Test Sistema Notifiche
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Usa questa pagina per testare il sistema di notifiche
        </p>

        <div className="space-y-4">
          {/* Current User */}
          <div>
            <button
              onClick={getCurrentUser}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Usa il mio ID
            </button>
            {currentUserId && (
              <p className="text-xs text-gray-500 mt-2">Il tuo User ID: {currentUserId}</p>
            )}
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID Destinatario
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID dell'utente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="general">General</option>
              <option value="message">Message</option>
              <option value="tournament">Tournament</option>
              <option value="announcement">Announcement</option>
              <option value="booking">Booking</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo della notifica"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Messaggio
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contenuto della notifica"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link (opzionale)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              result.success 
                ? "bg-green-50 border border-green-200 text-green-800" 
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{result.message}</span>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={sendTestNotification}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
            {loading ? "Invio in corso..." : "Invia Notifica Test"}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Come testare:</h3>
        <ol className="text-sm text-blue-800 space-y-2">
          <li>1. Clicca "Usa il mio ID" per auto-compilare il tuo User ID</li>
          <li>2. Scegli il tipo di notifica</li>
          <li>3. Personalizza titolo e messaggio</li>
          <li>4. Clicca "Invia Notifica Test"</li>
          <li>5. Controlla la campanella in alto a destra per vedere la notifica</li>
          <li>6. Apri la console del browser (F12) per vedere i log dettagliati</li>
        </ol>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Debug Info:</h3>
        <div className="text-xs text-gray-600 space-y-1 font-mono">
          <p>API Endpoint: /api/notifications</p>
          <p>Service Role: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}</p>
          <p>Real-time: Supabase Channels</p>
        </div>
      </div>
    </div>
  );
}
