"use client";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  project: string;
  status: "active" | "pending" | "completed";
  avatar?: string;
}

interface TeamCardProps {
  members: TeamMember[];
  onAddMember?: () => void;
}

const statusColors = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const statusLabels = {
  active: "Attivo",
  pending: "In Attesa",
  completed: "Completato",
};

export function TeamCard({ members, onAddMember }: TeamCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-emerald-500",
      "bg-pink-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team</h3>
        {onAddMember && (
          <button
            onClick={onAddMember}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            + Aggiungi
          </button>
        )}
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(index)}`}>
              {getInitials(member.name)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {member.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {member.project}
              </p>
            </div>

            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[member.status]}`}>
              {statusLabels[member.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
