import React, { useState, useEffect } from 'react';
import { env } from '../env.client';
import { getPlayerId, resetPlayerId, getPlayerIdInfo } from '../utils/player';
import { getApiBaseUrl } from '../utils/apiHelpers';

const getDefaultPlayerId = () => localStorage.getItem('nickname') || 'dev_player_001';

export const DevControls: React.FC = () => {
  const [word, setWord] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<ReturnType<typeof getPlayerIdInfo>>({ isValid: false });
  const playerId = getDefaultPlayerId();

  // Update player info when component mounts and on changes
  useEffect(() => {
    const updatePlayerInfo = () => {
      setPlayerInfo(getPlayerIdInfo());
    };
    updatePlayerInfo();
    
    // Update every 2 seconds to show changes
    const interval = setInterval(updatePlayerInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setStatus('Resetting...');
    try {
      // 🔧 PRODUCTION FIX: Use getApiBaseUrl helper for proper domain detection
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/dev/reset-session`;
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

  const handleResetPlayerId = () => {
    const newId = resetPlayerId();
    setStatus(`Player ID reset. New ID: ${newId?.substring(0, 8)}...`);
    setTimeout(() => {
      setPlayerInfo(getPlayerIdInfo());
      window.location.reload();
    }, 1000);
  };

  const handleTestLeaderboard = async () => {
    setStatus('Testing leaderboard...');
    try {
      const currentPlayerId = getPlayerId();
      const url = `${env.VITE_API_BASE_URL}/api/leaderboard?wordId=15ed1d6e-bddb-4b23-9ca5-36a8ca7a84bb&playerId=${currentPlayerId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setStatus(`Leaderboard: ${data.leaderboard?.length || 0} entries, Player rank: ${data.playerRank || 'none'}`);
      } else {
        setStatus(`Leaderboard error: ${data.error}`);
      }
    } catch (e) {
      setStatus('Leaderboard test failed');
    }
  };

  const copyPlayerId = () => {
    if (playerInfo.playerId) {
      navigator.clipboard.writeText(playerInfo.playerId);
      setStatus('Player ID copied to clipboard');
      setTimeout(() => setStatus(null), 2000);
    }
  };

  // Only show in dev mode
  if (!window.location.search.includes('dev=true')) return null;

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: 16, 
      margin: 16, 
      background: '#fafafa',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>Dev Controls</h3>
      
      {/* Player ID Info */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
        <h4>Player ID Info</h4>
        <div><strong>Current ID:</strong> {playerInfo.playerId || 'None'}</div>
        <div><strong>Valid UUID:</strong> {playerInfo.isValid ? '✅' : '❌'}</div>
        <div><strong>Generated:</strong> {playerInfo.generated || 'Unknown'}</div>
        <div style={{ marginTop: 8 }}>
          <button onClick={copyPlayerId} disabled={!playerInfo.playerId}>
            Copy Player ID
          </button>
          <button onClick={handleResetPlayerId} style={{ marginLeft: 8 }}>
            Reset Player ID
          </button>
        </div>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: 16 }}>
        <h4>Game Controls</h4>
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
        <button onClick={handleTestLeaderboard} style={{ marginLeft: 8 }}>
          Test Leaderboard
        </button>
      </div>

      {/* Multi-Player Testing */}
      <div style={{ marginBottom: 16 }}>
        <h4>Multi-Player Testing</h4>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: 8 }}>
          To test multiple players:
          <br />1. Open this page in different browsers/devices
          <br />2. Or use "Reset Player ID" to simulate different players
          <br />3. Complete games to see leaderboard populate
        </div>
        <div style={{ background: '#e8f4f8', padding: 8, borderRadius: 4 }}>
          <strong>URLs for testing:</strong>
          <br />• Desktop: {window.location.href}
          <br />• Mobile: Open same URL on phone
          <br />• Incognito: Open in private/incognito window
        </div>
      </div>

      {status && (
        <div style={{ 
          marginTop: 8, 
          padding: 8, 
          background: status.includes('error') || status.includes('failed') ? '#ffe6e6' : '#e6ffe6',
          borderRadius: 4 
        }}>
          {status}
        </div>
      )}
    </div>
  );
};
