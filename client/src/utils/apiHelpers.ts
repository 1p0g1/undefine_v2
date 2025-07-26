/**
 * Centralized API response handler to solve recurring JSON parsing errors
 * This addresses the systematic issue of APIs returning HTML instead of JSON
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public responseText?: string,
    public url?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Safe JSON response handler that prevents "Unexpected token" errors
 * Checks content-type and provides detailed error messages
 */
export async function safeJsonParse<T>(response: Response): Promise<T> {
  const url = response.url;
  const status = response.status;
  const statusText = response.statusText;
  
  console.log(`[safeJsonParse] Processing response from ${url}:`, {
    status,
    statusText,
    ok: response.ok,
    contentType: response.headers.get('content-type')
  });

  // Check if response is ok first
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[safeJsonParse] HTTP Error ${status}:`, errorText.substring(0, 300));
    throw new ApiError(
      `HTTP ${status}: ${statusText}`,
      status,
      statusText,
      errorText,
      url
    );
  }

  // Check content type before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const errorText = await response.text();
    console.error(`[safeJsonParse] Wrong content type from ${url}:`, {
      expected: 'application/json',
      received: contentType,
      content: errorText.substring(0, 300)
    });
    
    throw new ApiError(
      `Server returned ${contentType || 'unknown content type'} instead of JSON`,
      status,
      statusText,
      errorText,
      url
    );
  }

  // Try to parse JSON with detailed error handling
  try {
    const result = await response.json();
    console.log(`[safeJsonParse] Successfully parsed JSON from ${url}`);
    return result;
  } catch (jsonError) {
    const errorText = await response.text().catch(() => 'Could not read response text');
    console.error(`[safeJsonParse] JSON parsing failed for ${url}:`, {
      jsonError,
      responseText: errorText.substring(0, 300)
    });
    
    throw new ApiError(
      `Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
      status,
      statusText,
      errorText,
      url
    );
  }
}

/**
 * Enhanced fetch with automatic error handling and logging
 * Use this instead of fetch() for all API calls
 */
export async function safeFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  console.log(`[safeFetch] Making request to: ${url}`, {
    method: options.method || 'GET',
    headers: options.headers
  });

  try {
    const response = await fetch(url, options);
    return await safeJsonParse<T>(response);
  } catch (error) {
    console.error(`[safeFetch] Request failed to ${url}:`, error);
    throw error;
  }
}

/**
 * Checks if current environment is Vercel preview
 * Vercel previews can have different API configurations
 */
export function isVercelPreview(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
}

/**
 * Gets appropriate API base URL for current environment
 * Handles production vs preview environment differences
 */
export function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  console.log('[getApiBaseUrl] Environment info:', {
    baseUrl: baseUrl || 'relative URLs',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    isPreview: isVercelPreview(),
    env: import.meta.env.MODE
  });
  
  return baseUrl;
} 