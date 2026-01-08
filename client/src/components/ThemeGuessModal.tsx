import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { getThemeFeedbackMessage, getSimilarityBarColor, getSimilarityBarWidth, getUnDiamondColor } from '../utils/themeMessages';
import { UnPrefix } from './UnPrefix';
import { VaultLogo, VAULT_UNLOCK_SEQUENCE } from './VaultLogo';

interface ThemeStatus {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    // Similarity tracking data
    similarityScore?: number | null;
    confidencePercentage?: number | null;
    matchingMethod?: string | null;
  };
  weeklyThemedWords: Array<{
    id: string;
    word: string;
    date: string;
    completedOn: string;
    wasWon: boolean;
  }>;
}

interface ThemeStats {
  totalThemeAttempts: number;
  correctThemeGuesses: number;
  averageAttemptsPerTheme: number;
  averageWordsCompletedWhenGuessing: number;
  themesGuessed: string[];
}

interface ThemeGuessModalProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameDate?: string;
  isArchivePlay?: boolean;
  gameComplete?: boolean; // To detect when game is finished for call-to-action
  onThemeDataUpdate?: (themeData: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  }) => void;
}

export const ThemeGuessModal: React.FC<ThemeGuessModalProps> = ({ 
  open, 
  onClose, 
  gameId,
  gameDate,
  isArchivePlay = false,
  gameComplete = false,
  onThemeDataUpdate
}) => {
  const [guess, setGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeStatus, setThemeStatus] = useState<ThemeStatus | null>(null);
  const [themeStats, setThemeStats] = useState<ThemeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingResult, setShowingResult] = useState(false); // NEW: Show result before closing
  const [lastGuessResult, setLastGuessResult] = useState<{
    guess: string;
    isCorrect: boolean;
    actualTheme?: string;
    fuzzyMatch?: {
      method: 'exact' | 'synonym' | 'semantic' | 'error';
      confidence: number;
      similarity?: number;
    };
  } | null>(null);
  const [dataCache, setDataCache] = useState<{
    themeStatus: ThemeStatus | null;
    themeStats: ThemeStats | null;
    timestamp: number;
    contextDate: string | null;
  } | null>(null);

  // Theme data state for UN diamond coloring
  const [themeGuessData, setThemeGuessData] = useState<{
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  } | undefined>(undefined);

  // NEW: Simple theme history state
  const [simpleHistory, setSimpleHistory] = useState<Array<{
    guess: string;
    confidencePercentage: number | null;
  }>>([]);

  // NEW: Sunday failure revelation state
  const [sundayRevelation, setSundayRevelation] = useState<{
    shouldReveal: boolean;
    actualTheme: string;
    weeklyWords?: Array<{
      id: string;
      word: string;
      date: string;
      completedOn: string | null;
      isCompleted: boolean;
    }>;
  } | null>(null);

  // Vault unlock animation state
  const [isPlayingVaultAnimation, setIsPlayingVaultAnimation] = useState(false);
  const [vaultAnimationFrame, setVaultAnimationFrame] = useState<string>('/ClosedVault.png');
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playerId = getPlayerId();

  // Cleanup animation timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Function to play vault unlock animation
  const playVaultUnlockAnimation = useCallback(async () => {
    setIsPlayingVaultAnimation(true);
    
    let elapsed = 0;
    for (const frame of VAULT_UNLOCK_SEQUENCE) {
      await new Promise<void>((resolve) => {
        animationTimeoutRef.current = setTimeout(() => {
          setVaultAnimationFrame(frame.image);
          resolve();
        }, elapsed === 0 ? 0 : frame.duration);
        elapsed += frame.duration;
      });
      
      // Wait for the frame duration before moving to next
      if (frame.duration > 0) {
        await new Promise(resolve => setTimeout(resolve, frame.duration));
      }
    }
    
    // Keep final state (OpenVault)
    setIsPlayingVaultAnimation(false);
  }, []);

  // Load theme data when modal opens
  useEffect(() => {
    if (open && playerId) {
      // Clear previous guess results to prevent state persistence between sessions
      setLastGuessResult(null);
      
      // Check for pre-loaded data from GameSummaryModal
      const preloadedData = typeof window !== 'undefined' ? (window as any).__themeDataCache : null;
      
      // Use pre-loaded data if available and recent (within 2 minutes)
      const now = Date.now();
      const preloadedContextDate = preloadedData?.contextDate ?? null;
      const effectiveContextDate = gameDate ?? null;
      const isPreloadedForThisContext = preloadedContextDate === effectiveContextDate;

      if (preloadedData && (now - preloadedData.timestamp < 120000) && isPreloadedForThisContext) {
        console.log('[ThemeGuessModal] Using pre-loaded theme data');
        setThemeStatus(preloadedData.themeStatus);
        setThemeStats(preloadedData.themeStats);
        
        // Update theme guess data for Un diamond coloring
        if (preloadedData.themeStatus?.progress) {
          setThemeGuessData({
            hasGuessedToday: preloadedData.themeStatus.progress.hasGuessedToday,
            isCorrectGuess: preloadedData.themeStatus.progress.isCorrectGuess,
            confidencePercentage: preloadedData.themeStatus.progress.confidencePercentage || null
          });
        }
        
        setIsLoading(false);
        setError(null);
        
        // Clear the pre-loaded data after use
        if (typeof window !== 'undefined') {
          delete (window as any).__themeDataCache;
        }
        return;
      }
      
      // Use cached data if available and recent (within 2 minutes)
      if (dataCache && (now - dataCache.timestamp < 120000) && dataCache.contextDate === (gameDate ?? null)) {
        console.log('[ThemeGuessModal] Using cached theme data');
        setThemeStatus(dataCache.themeStatus);
        setThemeStats(dataCache.themeStats);
        
        // Update theme guess data for Un diamond coloring
        if (dataCache.themeStatus?.progress) {
          setThemeGuessData({
            hasGuessedToday: dataCache.themeStatus.progress.hasGuessedToday,
            isCorrectGuess: dataCache.themeStatus.progress.isCorrectGuess,
            confidencePercentage: dataCache.themeStatus.progress.confidencePercentage || null
          });
        }
        
        setIsLoading(false);
        setError(null);
      } else {
      loadThemeData();
      }
    }
  }, [open, playerId, gameDate, isArchivePlay]);

  const loadThemeData = async () => {
    if (!playerId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [statusResult, statsResult] = await Promise.all([
        apiClient.getThemeStatus(playerId, gameDate),
        apiClient.getThemeStats(playerId)
      ]);

      // Validate the status result
      if (!statusResult) {
        throw new Error('Failed to load theme status');
      }

      // Check if we got an error response
      if (typeof statusResult === 'object' && 'error' in statusResult && typeof statusResult.error === 'string') {
        throw new Error(statusResult.error);
      }

      // Cast the result to ThemeStatus
      const status = statusResult as ThemeStatus;
      
      // If player hasn't completed any words this week, show a friendly message
      if (status.hasActiveTheme && status.progress.completedWords === 0) {
        setError(isArchivePlay ? 'Win at least one word in this archive week to unlock theme guessing!' : 'Complete at least one word this week to unlock theme guessing!');
      } else {
        setThemeStatus(status);
        setThemeStats(statsResult as ThemeStats);
        
        // Update theme guess data for Un diamond coloring
        if (status.progress) {
          setThemeGuessData({
            hasGuessedToday: status.progress.hasGuessedToday,
            isCorrectGuess: status.progress.isCorrectGuess,
            confidencePercentage: status.progress.confidencePercentage || null
          });
        }

        // NEW: Load simple theme history (don't block on this)
        if (status.currentTheme) {
          loadSimpleHistory(status.currentTheme);
        }
        
        // Cache the data for 2 minutes
        setDataCache({
          themeStatus: status,
          themeStats: statsResult as ThemeStats,
          timestamp: Date.now(),
          contextDate: gameDate ?? null
        });
      }
    } catch (error) {
      console.error('[ThemeGuessModal] Error loading theme data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load theme data');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Load simple theme history for display
  const loadSimpleHistory = async (theme: string) => {
    if (!playerId || !theme) return;

    try {
      console.log('[ThemeGuessModal] Loading simple theme history for:', { theme, playerId });
      
      const response = await fetch(`/api/theme-history-simple?player_id=${playerId}&theme=${encodeURIComponent(theme)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSimpleHistory(data.guesses || []);
        console.log('[ThemeGuessModal] Simple theme history loaded:', data);
      } else {
        console.warn('[ThemeGuessModal] Failed to load simple theme history:', response.status);
      }
    } catch (err) {
      console.error('[ThemeGuessModal] Error loading simple theme history:', err);
      // Don't show error to user - this is optional data
    }
  };

  const handleClose = (overrideThemeData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  }) => {
    setGuess('');
    setError(null);
    setLastGuessResult(null);
    
    const themeDataToReturn = overrideThemeData || themeGuessData;
    if (onThemeDataUpdate && themeDataToReturn) {
      onThemeDataUpdate(themeDataToReturn);
    }
    
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isSubmitting || !playerId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.submitThemeGuess({
        player_id: playerId,
        guess: guess.trim(),
        gameId,
        gameDate
      });

      console.log('[ThemeGuessModal] Theme guess response:', response);

      // Store the guess result for display
      setLastGuessResult({
        guess: guess.trim(),
        isCorrect: response.isCorrect,
        actualTheme: response.actualTheme,
        fuzzyMatch: response.fuzzyMatch
      });

      // Prepare theme data update (but don't apply yet for correct guesses)
      const updatedThemeData = {
        hasGuessedToday: true,
        isCorrectGuess: response.isCorrect,
        confidencePercentage: response.fuzzyMatch?.confidence || null
      };

      // NEW: Check for Sunday failure revelation
      if (response.shouldRevealTheme && response.revelationReason === 'sunday_failure') {
        setSundayRevelation({
          shouldReveal: true,
          actualTheme: response.actualTheme || 'Unknown Theme',
          weeklyWords: response.weeklyWords
        });
      }

      // Prepare theme status update
      const updatedThemeStatus = themeStatus ? {
        ...themeStatus,
        progress: {
          ...themeStatus.progress,
          hasGuessedToday: true,
          themeGuess: guess.trim(),
          isCorrectGuess: response.isCorrect,
          confidencePercentage: response.fuzzyMatch?.confidence || null,
          matchingMethod: response.fuzzyMatch?.method || null
        }
      } : null;

      // NEW: Add guess to simple history
      setSimpleHistory(prev => [...prev, {
        guess: guess.trim(),
        confidencePercentage: response.fuzzyMatch?.confidence || null
      }]);

      // Clear the guess input
      setGuess('');

      // CRITICAL: For correct guesses, play animation FIRST, then update visual states
      // This creates suspense and makes the reveal more impactful
      if (response.isCorrect) {
        // Play vault unlock animation BEFORE showing colors/results
        await playVaultUnlockAnimation();
        
        // NOW update theme data (triggers color changes)
        setThemeGuessData(updatedThemeData);
        if (updatedThemeStatus) setThemeStatus(updatedThemeStatus);
        
        // Show result after animation
        setShowingResult(true);
      } else {
        // For incorrect guesses, update immediately (no animation)
        setThemeGuessData(updatedThemeData);
        if (updatedThemeStatus) setThemeStatus(updatedThemeStatus);
        setShowingResult(true);
      }

    } catch (error) {
      console.error('[ThemeGuessModal] Error submitting theme guess:', error);
      setError('Failed to submit theme guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  // CSS for cerebral theme animation
  const cerebralStyles = `
    @keyframes themeModalGlow {
      0%, 100% { box-shadow: 0 0 30px rgba(26, 35, 126, 0.15), 0 0 60px rgba(59, 130, 246, 0.1); }
      50% { box-shadow: 0 0 40px rgba(26, 35, 126, 0.25), 0 0 80px rgba(59, 130, 246, 0.15); }
    }
    @keyframes thinkingPulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.05); }
    }
    @keyframes floatingIdea {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
      25% { transform: translateY(-5px) rotate(5deg); opacity: 0.7; }
      50% { transform: translateY(-10px) rotate(0deg); opacity: 0.5; }
      75% { transform: translateY(-5px) rotate(-5deg); opacity: 0.7; }
    }
    .theme-modal-cerebral::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, 
        rgba(26, 35, 126, 0.3) 0%, 
        rgba(59, 130, 246, 0.2) 25%,
        rgba(139, 92, 246, 0.2) 50%,
        rgba(59, 130, 246, 0.2) 75%,
        rgba(26, 35, 126, 0.3) 100%
      );
      border-radius: 1.1rem;
      z-index: -1;
      animation: thinkingPulse 4s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .theme-modal-cerebral, .theme-modal-cerebral::before { animation: none !important; }
    }
  `;

  return (
    <>
      <style>{cerebralStyles}</style>
      <div className="modal-overlay" onClick={() => handleClose()} style={{
          position: 'fixed',
          top: 0,
          left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(10, 10, 30, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
        boxSizing: 'border-box',
        backdropFilter: 'blur(2px)'
      }}>
        <div 
          className="modal-content theme-modal-cerebral" 
          onClick={e => e.stopPropagation()} 
          style={{
            background: 'linear-gradient(180deg, #fdfbf6 0%, #f8f4ee 100%)',
            borderRadius: '1rem',
            padding: 'clamp(1rem, 4vw, 2rem)',
            width: '100%',
            maxWidth: 'min(480px, 90vw)',
            maxHeight: 'min(90vh, calc(100vh - 2rem))',
            overflowY: 'auto',
            color: '#1a237e',
            fontSize: '1rem',
            boxSizing: 'border-box',
            position: 'relative',
            animation: 'themeModalGlow 3s ease-in-out infinite'
          }}
        >
        {/* Modal Header with improved styling */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '2px',
          paddingTop: '0.5rem' // Add more spacing from top
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: '0.6rem',
            flex: '1',
            textAlign: 'center'
          }}>
            {/* Vault Logo + lock line - LARGE for animation showcase */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem', // Reduced gap since no interpunct
              marginBottom: '0.5rem'
            }}>
              <VaultLogo 
                large={true}
                themeGuessData={themeGuessData} 
                gameComplete={gameComplete}
                showCallToAction={false}
                isAnimating={isPlayingVaultAnimation}
                currentAnimationFrame={isPlayingVaultAnimation ? vaultAnimationFrame : undefined}
              />
              <span style={{
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                fontWeight: '700',
                fontFamily: 'var(--font-primary)',
                color: themeGuessData?.hasGuessedToday 
                  ? getUnDiamondColor(themeGuessData.confidencePercentage, themeGuessData.isCorrectGuess)
                  : '#1a237e',
                marginLeft: '-0.75rem', // More negative margin since no interpunct
                letterSpacing: '-0.02em'
              }}>
                lock
              </span>
            </div>
            
            {/* Theme of the Week line */}
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: themeGuessData?.hasGuessedToday 
                ? getUnDiamondColor(themeGuessData.confidencePercentage, themeGuessData.isCorrectGuess)
                : '#1a237e'
            }}>
              Theme of the Week
            </div>
            
            {/* Instructions */}
            <div style={{
              fontSize: '0.85rem',
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: '1.4',
              fontFamily: 'var(--font-primary)',
              marginTop: '0.25rem'
            }}>
              All 7 of this week's words are connected by a theme, each day you can guess and you will be given a semantic % similarity
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#9ca3af'
            }}
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>🔄 Loading theme information...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#dc2626',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && themeStatus && themeStats && (
          <div>
            {/* Theme Status Display */}
            <div style={{ marginBottom: '2px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem' 
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  Progress this week:
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#059669' }}>
                  {themeStatus.progress.completedWords} / {themeStatus.progress.totalWords}
                </span>
              </div>
              
              {/* Word completion progress bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '2px'
              }}>
                <div style={{
                  width: `${(themeStatus.progress.completedWords / themeStatus.progress.totalWords) * 100}%`,
                  height: '100%',
                  backgroundColor: '#059669',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Weekly Themed Words Section */}
            {themeStatus.weeklyThemedWords.length > 0 && (
              <div style={{
                backgroundColor: '#f8fffe',
                border: '1px solid #d1fae5',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '2px'
              }}>
                <h3 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.95rem', 
                  fontWeight: '600',
                  color: '#065f46'
                }}>
                  📚 This Week's Themed Words ({themeStatus.weeklyThemedWords.length})
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {themeStatus.weeklyThemedWords.map((wordInfo) => (
                    <div 
                      key={wordInfo.id}
                      style={{
                        backgroundColor: wordInfo.wasWon ? '#ecfdf5' : '#fef2f2',
                        border: wordInfo.wasWon ? '1px solid #a7f3d0' : '1px solid #fecaca',
                        borderRadius: '0.375rem',
                        padding: '0.5rem',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: '600',
                        color: wordInfo.wasWon ? '#047857' : '#b91c1c'
                      }}>
                        {wordInfo.word}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: wordInfo.wasWon ? '#059669' : '#dc2626',
                        marginTop: '0.25rem'
                      }}>
                        {new Date(wordInfo.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#047857', 
                  marginTop: '0.75rem',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  Green = you got the word. Red = you didn't get the word.
                </div>
              </div>
            )}

            {/* Fuzzy Match Result Display - Show for fresh guess OR when user has already guessed today */}
            {(((lastGuessResult && lastGuessResult.fuzzyMatch) || (themeStatus.progress.hasGuessedToday && themeStatus.progress.themeGuess)) && !(isPlayingVaultAnimation && lastGuessResult?.isCorrect)) ? (
              <div style={{
                backgroundColor: '#f8f9ff',
                border: '2px solid #e0e4ff',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '2px'
              }}>
                <div style={{ marginBottom: '2px' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem'
                  }}>
                    Your guess: "{lastGuessResult?.guess || themeStatus.progress.themeGuess}"
                  </div>
                  
                  {/* Show similarity score if available from fresh guess */}
                  {lastGuessResult && lastGuessResult.fuzzyMatch && (
                    <>
                      {/* Similarity Score Bar */}
                      <div style={{
                        width: '100%',
                        height: '12px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '2px'
                      }}>
                        <div style={{
                          width: `${getSimilarityBarWidth(lastGuessResult.fuzzyMatch.confidence)}%`,
                          height: '100%',
                          backgroundColor: getSimilarityBarColor(lastGuessResult.fuzzyMatch.confidence),
                          transition: 'width 0.8s ease',
                          borderRadius: '6px'
                        }} />
                      </div>
                      
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                        Similarity: {lastGuessResult.fuzzyMatch.confidence}%
                      </div>
                    </>
                  )}
                  
                  {/* Show similarity score for already guessed users */}
                  {themeStatus.progress.hasGuessedToday && !lastGuessResult && (
                    <>
                      {/* Show similarity score if available from stored data */}
                      {themeStatus.progress.confidencePercentage !== null && themeStatus.progress.confidencePercentage !== undefined && (
                        <>
                          {/* Similarity Score Bar for stored data */}
                          <div style={{
                            width: '100%',
                            height: '12px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '2px'
                          }}>
                            <div style={{
                              width: `${getSimilarityBarWidth(themeStatus.progress.confidencePercentage)}%`,
                              height: '100%',
                              backgroundColor: getSimilarityBarColor(themeStatus.progress.confidencePercentage),
                              transition: 'width 0.8s ease',
                              borderRadius: '6px'
                            }} />
                          </div>
                          
                          <div style={{
                            fontSize: '0.9rem',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            Similarity: {themeStatus.progress.confidencePercentage}%
              </div>
                        </>
                      )}
                      
                      {/* Fallback when no similarity data available */}
                      {(themeStatus.progress.confidencePercentage === null || themeStatus.progress.confidencePercentage === undefined) && (
              <div style={{
                          fontSize: '0.9rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          {themeStatus.progress.isCorrectGuess ? 
                            '🎯 Correct guess! Come back tomorrow for a new theme.' : 
                            '📊 Use this guess to infer the theme! Similarity scores now saved for future visits.'
                          }
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Funny Feedback Message - only show for fresh guesses with similarity data */}
                {lastGuessResult && lastGuessResult.fuzzyMatch && (() => {
                  // Filter out deprecated 'synonym' method
                  const validMethod = lastGuessResult.fuzzyMatch.method === 'synonym' 
                    ? 'semantic' 
                    : lastGuessResult.fuzzyMatch.method as 'exact' | 'semantic' | 'error';
                  
                  const feedbackMessage = getThemeFeedbackMessage(
                    lastGuessResult.fuzzyMatch.confidence,
                    lastGuessResult.actualTheme,
                    validMethod
                  );
                  
                  return (
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: feedbackMessage.isCorrect ? '#059669' : '#dc2626'
                    }}>
                      {feedbackMessage.emoji} {feedbackMessage.message}
                    </div>
                  );
                })()}
                
                {/* Enhanced feedback for already guessed users */}
                {themeStatus.progress.hasGuessedToday && !lastGuessResult && (() => {
                  // Use stored similarity data for better feedback if available
                  if (themeStatus.progress.confidencePercentage !== null && themeStatus.progress.confidencePercentage !== undefined) {
                    const feedbackMessage = getThemeFeedbackMessage(
                      themeStatus.progress.confidencePercentage,
                      themeStatus.progress.isCorrectGuess ? 'theme revealed' : undefined,
                      themeStatus.progress.matchingMethod as any
                    );
                    
                    return (
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: feedbackMessage.isCorrect ? '#059669' : '#dc2626'
                      }}>
                        {feedbackMessage.emoji} {feedbackMessage.isCorrect ? 'Correct!' : feedbackMessage.message}
                      </div>
                    );
                  }
                  
                  // Fallback to simple feedback
                  return (
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: themeStatus.progress.isCorrectGuess ? '#059669' : '#dc2626'
                    }}>
                      {themeStatus.progress.isCorrectGuess ? '🎯 Correct!' : '❌ Try again tomorrow'}
                </div>
                  );
                })()}

                {/* Continue button after showing result */}
                {showingResult && (
                  <button
                    onClick={() => handleClose(themeGuessData)}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      marginTop: '1rem',
                      backgroundColor: '#1a237e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Continue to Results
                  </button>
                )}
              </div>
            ) : null}

            {/* Unlocking placeholder during animation (prevents early reveal) */}
            {isPlayingVaultAnimation && lastGuessResult?.isCorrect && (
              <div style={{
                backgroundColor: '#f8f9ff',
                border: '2px solid #e0e4ff',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '2px',
                textAlign: 'center',
                color: '#1a237e',
                fontWeight: 600
              }}>
                🔓 Unlocking... finishing animation
              </div>
            )}

            {/* NEW: Sunday Failure Revelation Panel */}
            {sundayRevelation?.shouldReveal && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '2px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-primary)'
                }}>
                  Unlucky this week's theme was:
                </div>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  fontFamily: 'var(--font-primary)',
                  marginBottom: '2px'
                }}>
                  "{sundayRevelation.actualTheme}"
                </div>
                
                {/* Weekly Words Display */}
                {sundayRevelation.weeklyWords && sundayRevelation.weeklyWords.length > 0 && (
                  <div style={{
                    marginTop: '2px',
                    textAlign: 'left'
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: '#374151',
                      marginBottom: '0.75rem',
                      textAlign: 'center',
                      fontFamily: 'var(--font-primary)'
                    }}>
                      📚 This Week's Themed Words:
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '0.5rem'
                    }}>
                      {sundayRevelation.weeklyWords.map((wordData) => {
                        const date = new Date(wordData.date);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        return (
                          <div
                            key={wordData.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem',
                              backgroundColor: wordData.isCompleted ? '#f0fdf4' : '#fef2f2',
                              border: `2px solid ${wordData.isCompleted ? '#16a34a' : '#dc2626'}`,
                              borderRadius: '0.5rem',
                              fontFamily: 'var(--font-primary)'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <span style={{
                                fontSize: '1.2rem'
                              }}>
                                {wordData.isCompleted ? '✅' : '❌'}
                              </span>
                              <span style={{
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: wordData.isCompleted ? '#16a34a' : '#dc2626'
                              }}>
                                {wordData.word}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              fontWeight: 500
                            }}>
                              {dayName}, {dateStr}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Guess Form or Status */}
            {!themeStatus.progress.hasGuessedToday && themeStatus.progress.canGuessTheme ? (
              <form onSubmit={handleSubmit} style={{ marginBottom: '2px' }}>
                <div style={{ marginBottom: '2px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    What connects this week's words?
                  </label>
                  
                  {/* Theme history display - show past guesses with scores */}
                  {simpleHistory.length > 0 && (
                    <div style={{
                      backgroundColor: '#f0f4ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#4338ca',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        🧠 Your Previous Guesses:
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem'
                      }}>
                        {simpleHistory.map((entry, idx) => (
                          <div 
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.375rem 0.5rem',
                              backgroundColor: 'white',
                              borderRadius: '0.25rem',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ color: '#374151', fontWeight: 500 }}>
                              "{entry.guess}"
                            </span>
                            {entry.confidencePercentage !== null && (
                              <span style={{ 
                                color: getSimilarityBarColor(entry.confidencePercentage),
                                fontWeight: 600,
                                fontSize: '0.8rem'
                              }}>
                                {entry.confidencePercentage}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6366f1',
                        marginTop: '0.5rem',
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}>
                        Use your previous guesses to narrow down the theme!
                      </div>
                    </div>
                  )}
                  
                    <input
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="Enter your theme guess..."
                      style={{
                      width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                      border: '2px solid #e5e7eb',
                        fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                    <button
                  type="submit"
                      disabled={!guess.trim() || isSubmitting}
                      style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: guess.trim() && !isSubmitting ? '#1a237e' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: guess.trim() && !isSubmitting ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? '🤔 Thinking...' : '🎯 Submit Guess'}
                    </button>
              </form>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                {themeStatus.progress.hasGuessedToday ? (
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      ✅ You've already guessed today!
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      Come back tomorrow to try again
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      🔒 Complete more words to unlock theme guessing
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      You need to finish at least one word this week
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </div>
      </div>
    </>
  );
}; 