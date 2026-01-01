"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import StatusDot from "./StatusDot";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated,
}: NewConversationModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredUsers(
        users.filter((u) =>
          u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get current user to exclude from list
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .neq("id", user?.id || "")
        .order("full_name");

      if (!error && profiles) {
        setUsers(profiles);
        setFilteredUsers(profiles);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleUserSelection(userId: string) {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
      // Auto-enable group mode if multiple users selected
      if (selectedUsers.length >= 1) {
        setIsGroup(true);
      }
    }
  }

  async function createConversation() {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          participant_ids: selectedUsers,
          title: isGroup ? groupTitle : undefined,
          is_group: isGroup,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onConversationCreated(data.conversation_id);
        handleClose();
      } else {
        alert("Errore nella creazione della conversazione");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Errore nella creazione della conversazione");
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setSelectedUsers([]);
    setSearchQuery("");
    setIsGroup(false);
    setGroupTitle("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-safe pb-safe px-safe">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Nuova Conversazione
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca utenti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Group Options */}
          {selectedUsers.length > 1 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Conversazione di gruppo
                </span>
              </label>
              {isGroup && (
                <input
                  type="text"
                  placeholder="Nome del gruppo (opzionale)"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                return user ? (
                  <div
                    key={userId}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    <span>{user.full_name}</span>
                    <button
                      onClick={() => toggleUserSelection(userId)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Users List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nessun utente trovato
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`w-full p-3 flex items-center gap-3 rounded-lg transition-colors ${
                    selectedUsers.includes(user.id)
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-500"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent"
                  }`}
                >
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                        {user.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot userId={user.id} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.full_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      <StatusDot userId={user.id} showLabel={true} size="sm" />
                    </div>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={createConversation}
            disabled={selectedUsers.length === 0 || creating}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creazione...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Crea Conversazione</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
