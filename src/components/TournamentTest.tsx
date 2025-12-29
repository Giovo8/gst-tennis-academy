'use client';

import { useEffect, useState } from 'react';

/**
 * Test component per verificare l'API dei tornei
 * Aggiungi questo alla homepage per debug: import TournamentTest from '@/components/TournamentTest'
 */
export default function TournamentTest() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/tournaments?upcoming=true')
      .then(r => r.json())
      .then(d => {
        console.log('API Response:', d);
        setData(d);
      })
      .catch(e => {
        console.error('API Error:', e);
        setError(e.message);
      });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md border border-green-500 z-50">
      <h3 className="font-bold text-green-400 mb-2">🔍 Tournament API Test</h3>
      {error && <p className="text-red-400">Error: {error}</p>}
      {data && (
        <div className="text-xs space-y-2">
          <p>Status: <span className="text-green-400">✓ OK</span></p>
          <p>Tornei trovati: <span className="text-yellow-400">{data.tournaments?.length || 0}</span></p>
          {data.tournaments && data.tournaments.length > 0 && (
            <div className="mt-2 p-2 bg-gray-800 rounded">
              <p className="font-bold">Primo torneo:</p>
              <p>ID: {data.tournaments[0].id}</p>
              <p>Title: {data.tournaments[0].title}</p>
              <p>Status: {data.tournaments[0].status}</p>
              <p>Type: {data.tournaments[0].tournament_type}</p>
            </div>
          )}
          {data.tournaments && data.tournaments.length === 0 && (
            <p className="text-yellow-400">⚠️ Nessun torneo nel database</p>
          )}
        </div>
      )}
    </div>
  );
}
