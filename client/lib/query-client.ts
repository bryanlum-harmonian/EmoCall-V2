import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  // For production web builds, use window.location.origin if EXPO_PUBLIC_DOMAIN
  // points to a development domain or is not set
  if (typeof window !== "undefined" && window.location) {
    const currentOrigin = window.location.origin;
    // If we're on a production domain (not localhost, not replit dev), use current origin
    if (!currentOrigin.includes("localhost") && 
        !currentOrigin.includes("picard.replit.dev") &&
        !currentOrigin.includes(":8081")) {
      // We're on a production deployment - use the current origin
      return currentOrigin;
    }
  }

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  if (!host.startsWith("http")) {
    host = `https://${host}`;
  }
  
  let url = new URL(host);

  // Remove trailing slash to avoid double slashes when concatenating paths
  return url.href.replace(/\/$/, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
