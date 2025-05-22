import React, { useState, useEffect } from 'react';
import { fetchFromApi } from '../api/client';
import { env } from '../env.client';

const getDefaultPlayerId = () => localStorage.getItem('nickname') || 'dev_player_001';

export const DevControls: React.FC = () => {
  const [word, setWord] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const playerId = getDefaultPlayerId();

  useEffect(() => {
    // Check API URL configuration
    if (!env.VITE_API_BASE_URL) {
      setApiWarning('⚠️ VITE_API_BASE_URL is not set. API requests will fail.');
    } else {
      try {
        const url = new URL(env.VITE_API_BASE_URL);
        if (!url.protocol.startsWith('http')) {
          setApiWarning(`⚠️ Invalid API URL protocol: ${url.protocol}`);
        } else if (env.DEV && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
          setApiWarning('ℹ️ Using non-localhost API URL in development');
        }
      } catch (e) {
        setApiWarning(`⚠️ Invalid API URL format: ${env.VITE_API_BASE_URL}`);
      }
    }
  }, []);

  const handleReset = async () => {
    setStatus('Resetting...');
    try {
      const data = await fetchFromApi<{ word: string }>('/api/dev/reset-session', {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId, word: word || undefined }),
      });
      localStorage.setItem('nickname', playerId);
      setStatus(`Session reset for ${playerId} (${data.word})`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setStatus('Reset failed');
      console.error('Reset error:', e);
    }
  };

  // Only show in dev mode
  if (!window.location.search.includes('dev=true')) return null;

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, margin: 16, background: '#fafafa' }}>
      <h3>Dev Controls</h3>
      {apiWarning && (
        <div style={{ 
          marginBottom: 16, 
          padding: 8, 
          background: '#fff3cd', 
          border: '1px solid #ffeeba',
          borderRadius: 4,
          color: '#856404' 
        }}>
          {apiWarning}
          <div style={{ fontSize: '0.9em', marginTop: 4 }}>
            Current API URL: {env.VITE_API_BASE_URL || '(not set)'}
          </div>
        </div>
      )}
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
