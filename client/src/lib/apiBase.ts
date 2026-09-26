const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Where the browser reaches the API (REST and live updates).
 *
 * NEXT_PUBLIC_API_URL is fixed when the web app is built. When it says "localhost" but the page was
 * opened from another device on the network (a phone, tablet or LED PC via http://192.168.x.x:3000),
 * "localhost" would mean that device itself, so the page uses the host it was opened from instead.
 */
export function resolveApiBase(configured: string | undefined, pageHostname?: string): string {
  const url = new URL(configured || 'http://localhost:3005');
  if (pageHostname && LOCAL_HOSTS.has(url.hostname) && !LOCAL_HOSTS.has(pageHostname)) {
    url.hostname = pageHostname;
  }
  return url.toString().replace(/\/$/, '');
}

export const API_BASE = resolveApiBase(
  process.env.NEXT_PUBLIC_API_URL,
  typeof window === 'undefined' ? undefined : window.location.hostname,
);
