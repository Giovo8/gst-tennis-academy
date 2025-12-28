"use client";

import React from "react";

type RawParticipant = any;

function nextPowerOfTwo(n: number) {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))));
}

function displayName(p: RawParticipant) {
  if (!p) return 'TBD';
  if (typeof p === 'string') return p;
  if (p.name) return p.name;
  if (p.full_name) return p.full_name;
  if (p.profiles && p.profiles.full_name) return p.profiles.full_name;
  if (p.user_id) return p.user_id;
  return 'TBD';
}

export default function Bracket({ participants }: { participants: RawParticipant[] }) {
  const names = (participants || []).map(displayName).filter(Boolean);
  const total = names.length;
  if (total === 0) return <div className="text-sm text-muted">Nessun partecipante ancora.</div>;

  const size = nextPowerOfTwo(total);
  const padded = [...names];
  while (padded.length < size) padded.push('BYE');

  // Build rounds as array of arrays where each round is pairs
  const rounds: string[][] = [];
  let current = padded.slice();
  while (current.length >= 2) {
    rounds.push(current.slice());
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push('TBD');
    }
    current = next;
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="flex gap-6">
        {rounds.map((round, ri) => (
          <div key={ri} className="min-w-[160px]">
            <h4 className="text-xs text-muted-2 mb-2">Turno {ri + 1}</h4>
            <div className="space-y-3">
              {(() => {
                const pairs: Array<[string, string]> = [];
                for (let i = 0; i < round.length; i += 2) {
                  pairs.push([round[i] ?? 'TBD', round[i + 1] ?? 'TBD']);
                }
                return pairs.map((pair, pi) => (
                  <div key={pi} className="rounded-lg border border-white/6 bg-surface p-2">
                    <div className="text-sm font-medium text-white truncate">{pair[0]}</div>
                    <div className="text-sm text-muted truncate">{pair[1]}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
