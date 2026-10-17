'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
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
  const pillId = useId();
  const tabs = getTournamentTabs(meta);
  if (tabs.length <= 1) return null;

  return (
    <div className="flex gap-1 w-full p-1 rounded-lg bg-secondary shadow-sm">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative h-10 flex-1 min-w-0 rounded-md text-sm font-semibold transition-colors ${
              isActive ? 'text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-md bg-[#023047] shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
