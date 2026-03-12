/**
 * Near Misses Panel
 * 
 * Shows rejected theme guesses that scored close to the match threshold.
 * These are candidates for alias expansion or threshold adjustment.
 * 
 * @see docs/THEME_SCORING_IMPROVEMENT_PLAN.md (Phase 5)
 */

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/apiHelpers';
import { getAdminKey } from '../api/adminClient';

interface NearMiss {
  theme: string;
  guess: string;
  confidencePercentage: number;
  matchingMethod: string | null;
  similarityScore: number | null;
  attemptCount: number;
  playerCount: number;
  latestAttempt: string;
}

interface NearMissData {
  nearMisses: NearMiss[];
  total: number;
  summary: {
    uniqueGuesses: number;
    uniqueThemes: number;
    avgConfidence: number;
    topCandidatesForAlias: string[];
  };
}

export const NearMissesPanel: React.FC = () => {
  const [data, setData] = useState<NearMissData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeFilter, setThemeFilter] = useState('');
  const [minConf, setMinConf] = useState(50);
  const [maxConf, setMaxConf] = useState(77);

  const fetchNearMisses = async () => {
    setLoading(true);
    setError(null);
    
    const baseUrl = getApiBaseUrl();
    const adminKey = getAdminKey();
    const params = new URLSearchParams({
      minConfidence: minConf.toString(),
      maxConfidence: maxConf.toString(),
    });
    if (themeFilter.trim()) {
      params.set('theme', themeFilter.trim());
    }

    try {
      const response = await fetch(`${baseUrl}/api/admin/theme-near-misses?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch near misses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearMisses();
  }, []);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return '#f59e0b';
    if (conf >= 60) return '#fb923c';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1a237e' }}>
        🎯 Near Misses — Candidates for Alias Expansion
      </h3>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
        Rejected guesses that scored close to the match threshold (78%). High-confidence near-misses with multiple players are strong candidates for adding to the alias dictionary.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Theme Filter</label>
          <input
            type="text"
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            placeholder="All themes"
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              width: '180px',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Min %</label>
          <input
            type="number"
            value={minConf}
            onChange={e => setMinConf(parseInt(e.target.value) || 0)}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              width: '70px',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Max %</label>
          <input
            type="number"
            value={maxConf}
            onChange={e => setMaxConf(parseInt(e.target.value) || 77)}
            style={{
              padding: '0.4rem 0.6rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.85rem',
              width: '70px',
            }}
          />
        </div>
        <button
          onClick={fetchNearMisses}
          disabled={loading}
          style={{
            padding: '0.4rem 1rem',
            backgroundColor: '#1a237e',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#dc2626', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a237e' }}>{data.summary.uniqueGuesses}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Unique Guesses</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a237e' }}>{data.summary.uniqueThemes}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Themes Affected</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{data.summary.avgConfidence}%</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Avg Confidence</div>
            </div>
          </div>

          {/* Top candidates callout */}
          {data.summary.topCandidatesForAlias.length > 0 && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                Top Alias Candidates (65%+, 2+ players):
              </div>
              {data.summary.topCandidatesForAlias.map((c, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#374151', paddingLeft: '0.5rem' }}>
                  {c}
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {data.nearMisses.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#6b7280' }}>Theme</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#6b7280' }}>Guess</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280' }}>Confidence</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280' }}>Players</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280' }}>Attempts</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#6b7280' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nearMisses.map((nm, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 500 }}>{nm.theme}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#7c3aed' }}>"{nm.guess}"</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: getConfidenceColor(nm.confidencePercentage) + '20',
                          color: getConfidenceColor(nm.confidencePercentage),
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}>
                          {nm.confidencePercentage}%
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{nm.playerCount}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{nm.attemptCount}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        {nm.matchingMethod || 'unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              No near-misses found in the {minConf}%-{maxConf}% range.
            </div>
          )}
        </>
      )}
    </div>
  );
};
