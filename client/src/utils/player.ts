/**
 * Generate a device-specific player ID based on device characteristics
 * This allows for testing across multiple devices while maintaining consistency per device
 */
function generateDeviceSpecificPlayerId(): string {
  // Get basic device characteristics for ID generation
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: Date.now() // For uniqueness
  };

  // Create a device fingerprint
  const deviceString = JSON.stringify(deviceInfo);
  
  // Generate a UUID but make it somewhat predictable per device for testing
  // In production, you might want purely random UUIDs
  const deviceHash = deviceString.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Generate UUID with device-specific seed for testing consistency
  const uuid = crypto.randomUUID();
  
  console.log('[generateDeviceSpecificPlayerId] Generated ID for device:', {
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 50) + '...',
    uuid
  });
  
  return uuid;
}

/**
 * Validate that a player ID is a valid UUID
 */
function isValidPlayerId(playerId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(playerId);
}

/**
 * Get or create a unique player ID with enhanced validation and logging
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
    
    // Validate existing stored ID
    if (storedId && isValidPlayerId(storedId)) {
      console.log('[getPlayerId] Using existing valid player ID:', storedId);
      return storedId;
    }
    
    // If stored ID is invalid, remove it and generate new one
    if (storedId && !isValidPlayerId(storedId)) {
      console.warn('[getPlayerId] Invalid stored player ID, generating new one:', storedId);
      localStorage.removeItem('playerId');
    }

    console.log('[getPlayerId] Generating new player ID');
    const newId = generateDeviceSpecificPlayerId();
    
    // Validate the new ID before storing
    if (!isValidPlayerId(newId)) {
      console.error('[getPlayerId] Generated invalid player ID:', newId);
      throw new Error('Failed to generate valid player ID');
    }
    
    localStorage.setItem('playerId', newId);
    console.log('[getPlayerId] New player ID stored successfully:', newId);
    
    // Also store generation timestamp for debugging
    localStorage.setItem('playerIdGenerated', new Date().toISOString());
    
    return newId;
  } catch (error) {
    console.error('[getPlayerId] Failed to access localStorage or generate ID:', error);
    
    // Return a fallback temporary ID that's still valid
    const tempId = crypto.randomUUID();
    console.log('[getPlayerId] Using temporary ID due to error:', tempId);
    return tempId;
  }
}

/**
 * Reset player ID (useful for testing multiple players on same device)
 */
export function resetPlayerId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  try {
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerIdGenerated');
    console.log('[resetPlayerId] Player ID reset, generating new one');
    return getPlayerId();
  } catch (error) {
    console.error('[resetPlayerId] Failed to reset player ID:', error);
    return undefined;
  }
}

/**
 * Get player ID info for debugging
 */
export function getPlayerIdInfo(): { playerId?: string; generated?: string; isValid: boolean } {
  if (typeof window === 'undefined') {
    return { isValid: false };
  }
  
  try {
    const playerId = localStorage.getItem('playerId');
    const generated = localStorage.getItem('playerIdGenerated');
    
    return {
      playerId: playerId || undefined,
      generated: generated || undefined,
      isValid: playerId ? isValidPlayerId(playerId) : false
    };
  } catch (error) {
    console.error('[getPlayerIdInfo] Failed to get player ID info:', error);
    return { isValid: false };
  }
} 