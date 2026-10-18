'use client';

import { Users, Trophy, Target, Calendar, CalendarClock, type LucideIcon } from 'lucide-react';

export type TournamentTabKey =
  | 'schedule'
  | 'overview'
  | 'bracket'
  | 'groups'
  | 'calendar'
  | 'standings';

interface TournamentTabBarMeta {
  tournamentType?: string;
  currentPhase?: string;
  participantsCount: number;
  /** Torneo avviato con partite prenotate: aggiunge "In programma" come prima tab. */
  hasScheduledMatches?: boolean;
}

interface TabDef {
  key: TournamentTabKey;
  label: string;
  icon: LucideIcon;
}

export function getTournamentTabs(meta: TournamentTabBarMeta): TabDef[] {
  const tabs = getPhaseTabs(meta);
  if (
    meta.hasScheduledMatches &&
    meta.participantsCount > 0 &&
    meta.currentPhase !== 'iscrizioni'
  ) {
    return [{ key: 'schedule', label: 'In programma', icon: CalendarClock }, ...tabs];
  }
  return tabs;
}

function getPhaseTabs(meta: TournamentTabBarMeta): TabDef[] {
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

  // Tab di larghezza uguale (flex-1, gap 4px, padding 4px): la pillola della tab
  // attiva si posiziona con calc() e scorre con una transizione CSS.
  const count = tabs.length;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );
  const tabWidth = `((100% - 8px - ${(count - 1) * 4}px) / ${count})`;

  return (
    <div className="relative flex gap-1 w-full p-1 rounded-lg bg-secondary shadow-sm">
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 rounded-md bg-[#023047] shadow-sm transition-[left] duration-300 ease-out"
        style={{
          width: `calc${tabWidth}`,
          left: `calc(4px + ${activeIndex} * (${tabWidth} + 4px))`,
        }}
      />
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
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
