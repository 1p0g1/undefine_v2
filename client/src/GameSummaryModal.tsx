import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DefineBoxes, GuessStatus } from './components/DefineBoxes';
import { LeaderboardEntry } from './api/types';
import { createDefaultClueStatus } from '../../shared-types/src/clues';
import { FirstGamePrompt } from './components/FirstGamePrompt';
import { UnPrefix } from './components/UnPrefix';
import { getPlayerId } from './utils/player';
import { apiClient } from './api/client';
import { usePlayer } from './hooks/usePlayer';

interface GameSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  guessStatus: GuessStatus[];
  word: string;
  time: string;
  guessesUsed: number;
  fuzzyMatches: number;
  hintsUsed: number;
  date: string;
  isLoading?: boolean;
  error?: string;
  score?: {
    baseScore: number;
    fuzzyBonus: number;
    timePenalty: number;
    hintPenalty: number;
    score: number;
    guessPenalty?: number;
  };
  currentDisplayName?: string;
  onOpenSettings?: () => void;
  onOpenThemeModal?: () => void;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  open,
  onClose,
  onPlayAgain,
  leaderboard,
  playerRank,
  guessStatus,
  word,
  time,
  guessesUsed,
  fuzzyMatches,
  // hintsUsed, // Currently unused
  date,
  isLoading = false,
  error,
  score,
  currentDisplayName,
  onOpenSettings,
  onOpenThemeModal,
}) => {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Get player stats including streak data
  const { stats: playerStats } = usePlayer();
  
  // State for managing nickname prompt dismissal
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ENTRIES_PER_PAGE = 5;

  // Calculate pagination
  const totalPages = Math.ceil(leaderboard.length / ENTRIES_PER_PAGE);
  const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
  const endIndex = startIndex + ENTRIES_PER_PAGE;
  const currentPageEntries = leaderboard.slice(startIndex, endIndex);

  // Theme data state for UN diamond coloring
  const [themeGuessData, setThemeGuessData] = useState<{
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  } | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Focus trap
    if (modalRef.current) modalRef.current.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset nickname prompt and pre-load theme data when modal opens
  useEffect(() => {
    if (open) {
      // Check if user has dismissed prompt before
      const hasSkippedNickname = localStorage.getItem('hasSkippedNickname');
      const hasSetNickname = localStorage.getItem('hasSetNickname');
      
      // Only show prompt if they haven't set a nickname and haven't permanently skipped
      setShowNicknamePrompt(!hasSkippedNickname && !hasSetNickname);
      
      // Reset pagination when modal opens
      setCurrentPage(1);
      
      // Pre-load theme data for better UX when user clicks theme button
      if (onOpenThemeModal) {
        preloadThemeData();
      }
    }
  }, [open, onOpenThemeModal]);

  // Show nickname prompt after 3 seconds if no nickname is set
  useEffect(() => {
    if (!open) return;
    
    const hasSkippedNickname = localStorage.getItem('hasSkippedNickname');
    const hasCustomNickname = localStorage.getItem('hasCustomNickname');
    
    if (!hasSkippedNickname && !hasCustomNickname) {
      const timer = setTimeout(() => {
        setShowNicknamePrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Load theme data for UN diamond coloring
  useEffect(() => {
    if (!open) return;
    
    const loadThemeData = async () => {
      try {
        const playerId = getPlayerId();
        if (!playerId) return;
        
        const themeStatus = await apiClient.getThemeStatus(playerId);
        if (themeStatus && themeStatus.progress) {
          setThemeGuessData({
            hasGuessedToday: themeStatus.progress.hasGuessedToday,
            isCorrectGuess: themeStatus.progress.isCorrectGuess,
            confidencePercentage: themeStatus.progress.confidencePercentage || null
          });
        }
      } catch (error) {
        console.log('[GameSummaryModal] Failed to load theme data for UN diamond coloring:', error);
        // Don't show error for this background load
      }
    };

    loadThemeData();
  }, [open]);

  // Pre-load theme data in background for better performance
  const preloadThemeData = async () => {
    try {
      const playerId = getPlayerId();
      if (!playerId) return;
      
      console.log('[GameSummaryModal] Pre-loading theme data...');
      
      // Load theme data in background
      const [statusResult, statsResult] = await Promise.all([
        apiClient.getThemeStatus(playerId),
        apiClient.getThemeStats(playerId)
      ]);
      
      console.log('[GameSummaryModal] Theme data pre-loaded successfully');
      
      // Store in a way that ThemeGuessModal can access it
      // This helps the theme modal open instantly
      if (typeof window !== 'undefined') {
        (window as any).__themeDataCache = {
          themeStatus: statusResult,
          themeStats: statsResult,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.log('[GameSummaryModal] Theme data pre-loading failed:', error);
      // Don't show error for pre-loading failures
    }
  };

  if (!open) return null;

  const handleCopy = () => {
    const summary = `UN·DEFINE ${date}\n${guessStatus.map(s => (s === 'correct' ? '🟩' : s === 'incorrect' ? '🟥' : s === 'fuzzy' ? '🟧' : '⬜')).join('')}\n${time}\nundefine-v2-front.vercel.app`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleShare = () => {
    const shareText = `I ranked #${playerRank || '?'} in today's Un·Define!\n${guessStatus.map(s => (s === 'correct' ? '🟩' : s === 'incorrect' ? '🟥' : s === 'fuzzy' ? '🟧' : '⬜')).join('')}\n${time}\nundefine-v2-front.vercel.app`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle nickname prompt actions
  const handleSetNickname = () => {
    setShowNicknamePrompt(false);
    onClose(); // Close the summary modal
    onOpenSettings?.(); // Open settings modal
  };

  const handleSkipNickname = () => {
    setShowNicknamePrompt(false);
    localStorage.setItem('hasSkippedNickname', 'true');
  };

  // Handle theme modal opening
  const handleOpenThemeModal = () => {
    onOpenThemeModal?.();
    onClose(); // Close the summary modal when opening theme modal
  };

  // Get background color for top 3 positions
  const getRowBackgroundColor = (rank: number, isCurrentPlayer: boolean | undefined, idx: number) => {
    if (isCurrentPlayer) {
      return 'rgba(26, 35, 126, 0.1)';
    }
    if (rank === 1) {
      return 'rgba(255, 215, 0, 0.15)'; // Light gold
    }
    if (rank === 2) {
      return 'rgba(192, 192, 192, 0.15)'; // Light silver
    }
    if (rank === 3) {
      return 'rgba(205, 127, 50, 0.15)'; // Light bronze
    }
    return idx % 2 === 1 ? '#f7faff' : undefined;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 50,
        padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        style={{
          fontFamily: 'var(--font-primary)',
          background: 'var(--color-bg)',
          color: 'var(--color-primary)',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: 'clamp(1rem, 4vw, 2rem)',
          width: '100%',
          maxWidth: 'min(28rem, 90vw)',
          position: 'relative',
          maxHeight: 'min(90vh, calc(100vh - 2rem))',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          style={{ 
            fontFamily: 'var(--font-primary)',
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '0.25rem',
            zIndex: 1
          }}
        >
          ×
        </button>
        <div
          style={{
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            fontSize: 'clamp(1.2rem, 4vw, 1.45rem)',
            textAlign: 'center',
            marginBottom: '1rem',
            color: 'var(--color-primary)',
          }}
        >
          Today's Results
        </div>
        <div
          className="gs-modal-define-row"
          style={{
            margin: '0 0 1.1rem 0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 10,
            alignItems: 'center',
            gap: 'clamp(0.1rem, 0.5vw, 0.18rem)',
            transform: 'scale(clamp(0.7, 2vw, 0.85))',
            transformOrigin: 'center'
          }}
        >
          {/* Un· enhanced design with overlap effect */}
          <UnPrefix 
            scaled={true} 
            onClick={handleOpenThemeModal} 
            themeGuessData={themeGuessData}
            gameComplete={true}
          />
          <div style={{ 
            display: 'flex', 
            gap: 'clamp(0.06rem, 0.2vw, 0.1rem)',
            flex: '0 0 auto'
          }}>
            <DefineBoxes
              gameState={{
                gameId: '',
                wordId: '',
                wordText: word,
                clues: {
                  definition: '',
                  equivalents: '',
                  first_letter: '',
                  in_a_sentence: '',
                  number_of_letters: '',
                  etymology: ''
                },
                guesses: [],
                revealedClues: [],
                clueStatus: createDefaultClueStatus(),
                isComplete: true,
                isWon: true,
                score: null,
                startTime: ''
              }}
              revealedClues={[]}
              guessStatus={guessStatus}
              onBoxClick={() => {}}
            />
          </div>
        </div>
        
        {/* Word Success Message and Theme Prompt - positioned between DEFINE boxes and ranking */}
        {/* FIXED: Only show theme CTA for players who won (have a playerRank) */}
        {playerRank && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #16a34a',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontFamily: 'var(--font-primary)',
            }}
          >
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#16a34a',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              ✅ You guessed today's word "{word}"
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#1a237e',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              Now guess the{' '}
              <span 
                onClick={handleOpenThemeModal}
                style={{
                  color: '#1a237e',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted'
                }}
              >
                THEME
              </span>{' '}
              of the week
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#64748b',
              lineHeight: '1.4'
            }}>
              Can you figure out what connects this week's words?
            </div>
          </div>
        )}
        
        <div
          style={{
            textAlign: 'center',
            fontSize: 16,
            marginBottom: '1.1rem',
            fontFamily: 'var(--font-primary)',
            color: 'var(--color-primary)',
            fontWeight: 600,
          }}
        >
          <div style={{ marginBottom: 2 }}>
            {playerRank ? (
              <>Today you ranked <span style={{ fontWeight: 700 }}>#{playerRank}</span></>
            ) : (
              <>Today you didn't rank <span style={{ fontSize: '1.2rem' }}>:(</span></>
            )}
          </div>
          {playerRank ? (
            <div>
              Guesses: <span style={{ fontWeight: 700 }}>{guessesUsed}/6</span>, Fuzzy:{' '}
              <span style={{ fontWeight: 700 }}>{fuzzyMatches}/6</span>
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              Better luck tomorrow!
            </div>
          )}
          
          {/* Streak Celebration - show when on a winning streak */}
          {playerStats?.currentStreak && playerStats.currentStreak >= 1 && playerRank && (
            <div style={{ 
              backgroundColor: playerStats.currentStreak === 1 ? '#f3f4f6' : '#fef3c7', 
              border: `2px solid ${playerStats.currentStreak === 1 ? '#d1d5db' : '#fbbf24'}`,
              padding: '0.75rem', 
              borderRadius: '0.75rem',
              margin: '0.75rem 0',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1.1rem',
                fontWeight: 700,
                color: playerStats.currentStreak === 1 ? '#374151' : '#d97706',
                marginBottom: '0.25rem'
              }}>
                {playerStats.currentStreak === 1 
                  ? "🎉 First Win - Your Streak Begins! 🎉"
                  : `🔥 ${playerStats.currentStreak}-Game Winning Streak! 🔥`
                }
              </div>
              <div style={{ 
                fontSize: '0.9rem',
                color: playerStats.currentStreak === 1 ? '#6b7280' : '#92400e',
                fontStyle: 'italic'
              }}>
                {playerStats.currentStreak === 1 ? "Win again tomorrow to build your streak!" :
                 playerStats.currentStreak >= 20 ? "You're a legend! 💎" :
                 playerStats.currentStreak >= 15 ? "Absolutely amazing! 🚀" :
                 playerStats.currentStreak >= 10 ? "You're on fire! ⭐" :
                 playerStats.currentStreak >= 5 ? "Keep it up! 🟡" : "Nice streak! 🟠"}
              </div>
            </div>
          )}
          
          {/* Streak encouragement for non-winners */}
          {(!playerRank || (playerStats?.currentStreak === 0)) && (
            <div style={{ 
              backgroundColor: '#f9fafb', 
              border: '2px solid #e5e7eb',
              padding: '0.75rem', 
              borderRadius: '0.75rem',
              margin: '0.75rem 0',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1rem',
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                💤 Start Your Winning Streak!
              </div>
              <div style={{ 
                fontSize: '0.85rem',
                color: '#9ca3af',
                fontStyle: 'italic'
              }}>
                Come back tomorrow and aim for the leaderboard
              </div>
            </div>
          )}
          
          {score && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#1a237e' }}>Score Breakdown (NEW System)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 600 }}>Base Score (Guess #{guessesUsed}):</div>
                <div style={{ fontWeight: 600, color: '#1a237e' }}>{score.baseScore}</div>
                
                {score.fuzzyBonus > 0 && (
                  <>
                    <div>Fuzzy Match Bonus:</div>
                    <div style={{ color: '#059669', fontWeight: 500 }}>+{score.fuzzyBonus}</div>
                  </>
                )}
                
                {score.timePenalty > 0 && (
                  <>
                    <div>Time Penalty:</div>
                    <div style={{ color: '#ef4444' }}>-{score.timePenalty}</div>
                  </>
                )}
                
                {score.hintPenalty > 0 && (
                  <>
                    <div>Hint Penalty:</div>
                    <div style={{ color: '#ef4444' }}>-{score.hintPenalty}</div>
                  </>
                )}
                
                <hr style={{ gridColumn: '1 / -1', margin: '0.5rem 0', border: 'none', borderTop: '1px solid #d1d5db' }} />
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Final Score:</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a237e' }}>{score.score}</div>
              </div>
              
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                💡 New System: Earlier guesses = higher base score. Fuzzy matches give bonus points!
              </div>
            </div>
          )}
        </div>
        <div
          className="gs-modal-table-wrap"
          style={{ width: '100%', overflowX: 'auto', marginBottom: '1.2rem' }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ marginBottom: '1rem' }} />
              Loading leaderboard...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              No entries yet. Be the first to complete today's word!
            </div>
          ) : (
          <>
            <table
              className="gs-modal-table"
              style={{
                width: '100%',
                fontFamily: 'var(--font-primary)',
                fontSize: 13,
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                    Rank
                  </th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                    Player
                  </th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                    DEFINE
                  </th>
                  <th
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid #e5e7eb',
                      textAlign: 'center',
                    }}
                  >
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageEntries.map((entry, idx) => (
                  <tr
                      key={entry.id}
                    style={{
                      background: getRowBackgroundColor(entry.rank, entry.is_current_player, idx),
                        fontWeight: entry.is_current_player ? 600 : entry.rank === 1 ? 700 : 400,
                      borderBottom: '1px solid #f0f0f0',
                        animation: entry.is_current_player ? 'highlightRow 1s ease-out' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                      <span
                        style={{
                          fontSize: 15,
                          marginRight: 4,
                          verticalAlign: 'top',
                          display: 'inline-block',
                        }}
                      >
                        {entry.rank === 1
                          ? '🥇'
                          : entry.rank === 2
                            ? '🥈'
                            : entry.rank === 3
                              ? '🥉'
                              : entry.rank}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '0.5rem 0.75rem', 
                      verticalAlign: 'top',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100px'
                    }}>
                        {entry.player_name}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'top' }}>
                      {/* Mini DEFINE boxes */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '2px', 
                        justifyContent: 'center',
                        flexWrap: 'nowrap'
                      }}>
                        {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, idx) => {
                          // Determine box color based on game state
                          let bgColor = '#fff'; // Default white (not revealed)
                          let textColor = '#1a237e';
                          let borderColor = '#1a237e';
                          
                          // Check if this box was reached
                          if (idx < entry.guesses_used) {
                            // Box was revealed
                            if (idx === entry.guesses_used - 1) {
                              // Winning box (green)
                              bgColor = '#22c55e';
                              textColor = '#fff';
                              borderColor = '#22c55e';
                            } else {
                              // Previous guess boxes
                              // Distribute fuzzy matches among the previous guesses
                              // First fuzzy_matches boxes are orange, rest are red
                              const fuzzyCount = entry.fuzzy_matches || 0;
                              if (idx < fuzzyCount) {
                                // Orange (fuzzy match)
                                bgColor = '#f97316';
                                textColor = '#fff';
                                borderColor = '#f97316';
                              } else {
                                // Red (wrong)
                                bgColor = '#ef4444';
                                textColor = '#fff';
                                borderColor = '#ef4444';
                              }
                            }
                          }
                          
                          return (
                            <div
                              key={idx}
                              style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                backgroundColor: bgColor,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                color: textColor,
                                fontFamily: 'var(--font-primary)'
                              }}
                            >
                              {letter}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td
                      style={{ padding: '0.5rem 0.75rem', textAlign: 'center', verticalAlign: 'top' }}
                    >
                        {formatTime(entry.best_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginTop: '1rem',
                fontFamily: 'var(--font-primary)',
                fontSize: '0.875rem'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: currentPage === 1 ? 'default' : 'pointer',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  ‹ Prev
                </button>
                
                <span style={{ 
                  color: '#6b7280', 
                  fontWeight: 500,
                  minWidth: '4rem',
                  textAlign: 'center'
                }}>
                  {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    borderRadius: '0.25rem',
                    cursor: currentPage === totalPages ? 'default' : 'pointer',
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.75rem'
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
          )}
        </div>
        
        {/* Nickname Prompt - shows if user hasn't set custom nickname and hasn't skipped */}
        {showNicknamePrompt && currentDisplayName && (
          <FirstGamePrompt
            currentDisplayName={currentDisplayName}
            onSetNickname={handleSetNickname}
            onSkip={handleSkipNickname}
          />
        )}
        
        <div
          className="gs-modal-actions"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 8,
            animation: 'fadeIn 0.5s',
          }}
        >
          <button
            className="gs-modal-share"
            onClick={handleShare}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: '#fff',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 700,
            }}
          >
            <span role="img" aria-label="Share" style={{ fontSize: 18 }}>
              📢
            </span>{' '}
            Share Your Rank
          </button>
          <button
            className="gs-modal-copy"
            onClick={handleCopy}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 700,
            }}
          >
            <span role="img" aria-label="Copy" style={{ fontSize: 18 }}>
              📋
            </span>{' '}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="gs-modal-play"
            onClick={onPlayAgain}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: '#fff',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Play Again
          </button>
        </div>
        </div>
        <style>{`
        @keyframes highlightRow {
          0% { background-color: rgba(26, 35, 126, 0.1); }
          100% { background-color: transparent; }
          }
          @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
          }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #f3f4f6;
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
          }
        `}</style>
    </div>,
    document.body
  );
};
