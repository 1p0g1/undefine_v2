/**
 * Get or create a unique player ID
 * @returns The player ID or undefined if running on server
 */
export function getPlayerId(): string | undefined {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const storedId = localStorage.getItem('playerId');
    if (storedId) return storedId;

    const newId = crypto.randomUUID();
    localStorage.setItem('playerId', newId);
    return newId;
  } catch (error) {
    console.error('Failed to access localStorage:', error);
    // Return a temporary ID if localStorage is not available
    return crypto.randomUUID();
  }
} 