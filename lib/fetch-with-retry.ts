/**
 * Fetch wrapper with automatic retry and exponential backoff.
 * Retries on network errors and 5xx status codes.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  { retries = 2, baseDelay = 1000 }: { retries?: number; baseDelay?: number } = {}
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || response.status < 500) {
        return response;
      }

      // Server error — retry
      lastError = new Error(`Server error: ${response.status}`);
    } catch (err) {
      // Network error — retry
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Fetch failed after retries');
}
