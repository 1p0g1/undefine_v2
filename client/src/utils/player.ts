/**
 * Get or create a unique player ID
 * @returns The player ID or undefined if running on server
 */
export function getPlayerId(): string | undefined {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('[getPlayerId] Running on server, no player ID available');
    return undefined;
  }

  try {
    const storedId = localStorage.getItem('playerId');
    if (storedId) {
      console.log('[getPlayerId] Using existing player ID');
      return storedId;
    }

    console.log('[getPlayerId] Generating new player ID');
    const newId = crypto.randomUUID();
    localStorage.setItem('playerId', newId);
    console.log('[getPlayerId] New player ID stored successfully');
    return newId;
  } catch (error) {
    console.error('[getPlayerId] Failed to access localStorage:', error);
    // Return a temporary ID if localStorage is not available
    const tempId = crypto.randomUUID();
    console.log('[getPlayerId] Using temporary ID due to localStorage error');
    return tempId;
  }
} 