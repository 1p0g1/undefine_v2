/**
 * Get or create a unique player ID
 * @returns The player ID
 */
export function getPlayerId(): string {
  const storedId = localStorage.getItem('playerId');
  if (storedId) return storedId;

  const newId = crypto.randomUUID();
  localStorage.setItem('playerId', newId);
  return newId;
} 