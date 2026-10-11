'use client';

import { Users, Trophy, Target, Calendar, type LucideIcon } from 'lucide-react';

export type TournamentTabKey = 'overview' | 'bracket' | 'groups' | 'calendar' | 'standings';

export interface TournamentTabBarMeta {
  tournamentType?: string;
  currentPhase?: string;
  participantsCount: number;
}

interface TabDef {
  key: TournamentTabKey;
  label: string;
  icon: LucideIcon;
}

export function getTournamentTabs(meta: TournamentTabBarMeta): TabDef[] {
  const { tournamentType, currentPhase, participantsCount } = meta;

  if (participantsCount === 0 || currentPhase === 'iscrizioni') {
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  if (tournamentType === 'eliminazione_diretta') {
    if (currentPhase === 'eliminazione' || currentPhase === 'completato') {
      return [{ key: 'bracket', label: 'Tabellone', icon: Trophy }];
    }
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  if (tournamentType === 'girone_eliminazione') {
    if (currentPhase === 'gironi') {
      return [{ key: 'groups', label: 'Gironi', icon: Target }];
    }
    if (currentPhase === 'eliminazione' || currentPhase === 'completato') {
      return [
        { key: 'groups', label: 'Gironi', icon: Target },
        { key: 'bracket', label: 'Tabellone', icon: Trophy },
      ];
    }
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  if (tournamentType === 'campionato') {
    if (currentPhase === 'campionato' || currentPhase === 'completato') {
      return [
        { key: 'standings', label: 'Classifica', icon: Trophy },
        { key: 'calendar', label: 'Calendario', icon: Calendar },
      ];
    }
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
}

interface TournamentTabBarProps {
  meta: TournamentTabBarMeta;
  activeTab: TournamentTabKey;
  onChange: (tab: TournamentTabKey) => void;
}

export default function TournamentTabBar({ meta, activeTab, onChange }: TournamentTabBarProps) {
  const tabs = getTournamentTabs(meta);
  if (tabs.length <= 1) return null;

  return (
    <div className="flex gap-2 w-full">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`h-11 flex-1 min-w-0 rounded-lg border text-sm font-semibold transition-colors ${
              isActive
                ? 'border-[#023047] bg-[#023047] text-white'
                : 'border-secondary bg-secondary text-white hover:opacity-90'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
