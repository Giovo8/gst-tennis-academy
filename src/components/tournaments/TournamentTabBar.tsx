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
      return [
        { key: 'overview', label: 'Partecipanti', icon: Users },
        { key: 'bracket', label: 'Tabellone', icon: Trophy },
      ];
    }
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  if (tournamentType === 'girone_eliminazione') {
    if (currentPhase === 'gironi') {
      return [
        { key: 'overview', label: 'Partecipanti', icon: Users },
        { key: 'groups', label: 'Gironi', icon: Target },
      ];
    }
    if (currentPhase === 'eliminazione' || currentPhase === 'completato') {
      return [
        { key: 'overview', label: 'Partecipanti', icon: Users },
        { key: 'groups', label: 'Gironi', icon: Target },
        { key: 'bracket', label: 'Tabellone', icon: Trophy },
      ];
    }
    return [{ key: 'overview', label: 'Partecipanti', icon: Users }];
  }

  if (tournamentType === 'campionato') {
    return [
      { key: 'overview', label: 'Partecipanti', icon: Users },
      { key: 'calendar', label: 'Calendario', icon: Calendar },
      { key: 'standings', label: 'Classifica', icon: Trophy },
    ];
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
    <div className="flex gap-1 sm:gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 px-2 sm:px-4 py-2 rounded-lg transition-colors flex justify-center items-center border ${
              isActive
                ? 'border-secondary bg-secondary text-white'
                : 'border-black/10 bg-white text-secondary/70 hover:text-secondary hover:border-secondary'
            }`}
          >
            <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
