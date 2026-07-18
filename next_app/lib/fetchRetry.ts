export async function fetchRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 800
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    // Retry on transient server errors (5xx) or rate limiting (429)
    if (!res.ok && retries > 0 && (res.status >= 500 || res.status === 429)) {
      console.warn(`Transient fetch error ${res.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchRetry(url, options, retries - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Network fetch error: ${err}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}
