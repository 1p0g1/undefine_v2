import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getPlayerId } from '../utils/player';
import { env } from '../env.client';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentDisplayName?: string;
  onNicknameUpdate: (newNickname: string) => void;
  onShowRules?: () => void;
  onShowLeaderboard?: () => void;
  onShowAllTimeLeaderboard?: () => void;
  onShowGameHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  currentDisplayName,
  onNicknameUpdate,
  onShowRules,
  onShowLeaderboard,
  onShowAllTimeLeaderboard,
  onShowGameHistory
}) => {
  const [nickname, setNickname] = useState(currentDisplayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update nickname when modal opens with current value
  useEffect(() => {
    if (open) {
      setNickname(currentDisplayName || '');
      setError(null);
      setSuccess(false);
      // Focus the input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, currentDisplayName]);

  // Handle keyboard events
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, nickname]);

  // Handle focus trap
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  // Validation function
  const validateNickname = (name: string): string | null => {
    const trimmed = name.trim();
    
    if (trimmed.length === 0) {
      return 'Nickname cannot be empty';
    }
    
    if (trimmed.length > 20) {
      return 'Nickname must be 20 characters or fewer';
    }
    
    if (!/^[a-zA-Z0-9\s\-_.']+$/.test(trimmed)) {
      return 'Only letters, numbers, spaces, and basic punctuation allowed';
    }
    
    return null;
  };

  const handleSave = async () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playerId = getPlayerId();
      const response = await fetch(`${env.VITE_API_BASE_URL}/api/player/nickname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: playerId,
          display_name: nickname.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to update nickname');
      }

      // Success!
      setSuccess(true);
      onNicknameUpdate(data.display_name);
      
      // Store the new nickname in localStorage for caching
      localStorage.setItem('playerDisplayName', data.display_name);
      localStorage.setItem('hasSetNickname', 'true');
      
      // Close modal after brief success feedback
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('[SettingsModal] Failed to update nickname:', err);
      setError(err instanceof Error ? err.message : 'Failed to update nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNickname(currentDisplayName || '');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  const trimmedNickname = nickname.trim();
  const validationError = validateNickname(nickname);
  const hasChanges = trimmedNickname !== (currentDisplayName || '').trim();
  const canSave = !isLoading && !validationError && hasChanges && trimmedNickname.length > 0;

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
        zIndex: 60,
        padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        style={{
          fontFamily: 'var(--font-primary)',
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: 'clamp(1rem, 4vw, 2rem)',
          width: '100%',
          maxWidth: 'min(24rem, 90vw)',
          position: 'relative',
          color: 'var(--color-primary, #1a237e)',
          maxHeight: 'min(90vh, calc(100vh - 2rem))',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: 'var(--color-primary, #1a237e)',
          }}
        >
          Menu
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#9ca3af',
            lineHeight: 1,
            padding: '0.25rem',
          }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Menu Items */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => {
              onShowRules?.();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              textAlign: 'left',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            📚 How to Play
          </button>
          
          <button
            onClick={() => {
              onShowLeaderboard?.();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              textAlign: 'left',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            🏆 Today's Leaderboard
          </button>

          <button
            onClick={() => {
              onShowAllTimeLeaderboard?.();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              textAlign: 'left',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            📊 All-Time Stats
          </button>

          <button
            onClick={() => {
              onShowGameHistory?.();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: 'var(--font-primary)',
              textAlign: 'left',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            📅 My Game History
          </button>
        </div>

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          backgroundColor: '#e5e7eb', 
          marginBottom: '1.5rem' 
        }} />

        {/* Nickname Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="nickname-input"
            style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: 'var(--color-primary, #1a237e)',
            }}
          >
            Display Name
          </label>
          
          <input
            ref={inputRef}
            id="nickname-input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname..."
            maxLength={20}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
              backgroundColor: isLoading ? '#f9fafb' : 'white',
              color: 'var(--color-primary, #1a237e)',
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = 'var(--color-primary, #1a237e)';
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = '#e5e7eb';
              }
            }}
          />

          {/* Character count */}
          <div
            style={{
              textAlign: 'right',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
              color: nickname.length > 20 ? '#ef4444' : '#6b7280',
            }}
          >
            {nickname.length}/20
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              border: '1px solid #bbf7d0',
            }}
          >
            ✅ Nickname updated successfully!
          </div>
        )}

        {/* Preview */}
        {trimmedNickname && !validationError && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--color-primary, #1a237e)',
              }}
            >
              Leaderboard Preview:
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                color: '#4b5563',
                fontFamily: 'monospace',
              }}
            >
              🥇 {trimmedNickname} - 02:34 - 3 guesses
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              backgroundColor: 'white',
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={!canSave || success}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '2px solid var(--color-primary, #1a237e)',
              backgroundColor: canSave && !success ? 'var(--color-primary, #1a237e)' : '#f3f4f6',
              color: canSave && !success ? 'white' : '#9ca3af',
              cursor: canSave && !success ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              minWidth: '80px',
            }}
          >
            {isLoading ? '...' : success ? '✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}; 