/**
 * API Configuration for the Software Project Architect Widget
 * 
 * Handles the basePath routing when the widget is deployed with /widget prefix
 */

// Get the API base URL from environment or use the widget prefix
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/widget/api';

/**
 * Helper function to create API endpoints
 * @param endpoint The API endpoint (without /api prefix)
 * @returns Full API URL with proper base path
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE}/${cleanEndpoint}`;
}

/**
 * Helper function for making API calls with proper error handling
 * @param endpoint API endpoint
 * @param options Fetch options
 * @returns Promise with the response
 */
export async function apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = getApiUrl(endpoint);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}