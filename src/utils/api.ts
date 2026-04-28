/**
 * Handle API error responses consistently
 */
export async function handleApiError(res: Response): Promise<never> {
  const err = await res.json().catch(() => ({ error: "Network error" }));
  throw new Error(err.error || `Server error ${res.status}`);
}

/**
 * Fetch with a timeout
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds (default 30000)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Combined fetch with timeout and error handling
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetchWithTimeout(url, options, 30000);
  if (!res.ok) {
    await handleApiError(res);
  }
  return res.json();
}
