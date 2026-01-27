import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Check if we're in a browser environment on a production/custom domain
 */
function isProductionWebBuild(): boolean {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }
  
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  
  // Development patterns to exclude
  const devPatterns = [
    "localhost",
    "127.0.0.1",
    "picard.replit.dev",
    ".replit.dev",
    ":8081",
    ":3000"
  ];
  
  // Check if any dev pattern matches
  for (const pattern of devPatterns) {
    if (origin.includes(pattern) || hostname.includes(pattern)) {
      return false;
    }
  }
  
  // If we get here, we're on a production domain
  return true;
}

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // For production web builds, always use window.location.origin
  // This ensures API calls go to the correct server regardless of build-time config
  if (isProductionWebBuild()) {
    const origin = window.location.origin;
    console.log("[getApiUrl] Production detected, using origin:", origin);
    return origin;
  }

  let host = process.env.EXPO_PUBLIC_DOMAIN;
  console.log("[getApiUrl] Development mode, EXPO_PUBLIC_DOMAIN:", host);

  if (!host) {
    // Last resort fallback for web
    if (typeof window !== "undefined" && window.location) {
      console.log("[getApiUrl] No EXPO_PUBLIC_DOMAIN, falling back to origin:", window.location.origin);
      return window.location.origin;
    }
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
