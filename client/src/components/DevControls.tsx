import React, { useState } from 'react';
import { env } from '../env.client';

const getDefaultPlayerId = () => localStorage.getItem('nickname') || 'dev_player_001';

export const DevControls: React.FC = () => {
  const [word, setWord] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const playerId = getDefaultPlayerId();

  const handleReset = async () => {
    setStatus('Resetting...');
    try {
      const url = `${env.VITE_API_BASE_URL}/api/dev/reset-session`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, word: word || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('nickname', playerId);
        setStatus(`Session reset for ${playerId} (${data.word})`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setStatus(data.error || 'Reset failed');
      }
    } catch (e) {
      setStatus('Reset failed');
    }
  };

  // Only show in dev mode
  if (!window.location.search.includes('dev=true')) return null;

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, margin: 16, background: '#fafafa' }}>
      <h3>Dev Controls</h3>
      <div style={{ marginBottom: 8 }}>
        <label>
          Word override:{' '}
          <input
            type="text"
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder="(blank for today's word)"
          />
        </label>
      </div>
      <button onClick={handleReset}>Reset Session</button>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </div>
  );
};
