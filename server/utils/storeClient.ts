/**
 * Store Client Utilities
 * 
 * Handles HTTP requests to individual Nomin backends with timeout and error handling.
 */

import type { StoreConfig } from "../config/stores.js";

const DEFAULT_TIMEOUT = 10000; // 10 seconds

interface StoreRequestOptions {
  timeout?: number;
  signal?: AbortSignal;
}

interface StoreResponse<T> {
  data: T | null;
  error: string | null;
  storeId: string;
  storeName: string;
}

/**
 * Make a request to a specific store with timeout and error handling.
 */
async function requestStore<T>(
  store: StoreConfig,
  path: string,
  queryParams?: Record<string, string>,
  options: StoreRequestOptions = {}
): Promise<StoreResponse<T>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Merge with any provided signal
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const query = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : "";
    const url = `${store.baseUrl}${path}${query}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Store ${store.id} returned ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData?.error === "string") {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignore JSON parse errors
      }
      return {
        data: null,
        error: errorMessage,
        storeId: store.id,
        storeName: store.name
      };
    }

    const data = (await response.json()) as T;
    return {
      data,
      error: null,
      storeId: store.id,
      storeName: store.name
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: null,
        error: `Request to ${store.id} timed out after ${timeout}ms`,
        storeId: store.id,
        storeName: store.name
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      storeId: store.id,
      storeName: store.name
    };
  }
}

/**
 * Query multiple stores in parallel.
 */
export async function queryStores<T>(
  stores: StoreConfig[],
  path: string,
  queryParams?: Record<string, string>,
  options: StoreRequestOptions = {}
): Promise<StoreResponse<T>[]> {
  const promises = stores.map(store =>
    requestStore<T>(store, path, queryParams, options)
  );

  return Promise.all(promises);
}

/**
 * Query a single store by ID.
 */
export async function queryStore<T>(
  store: StoreConfig,
  path: string,
  queryParams?: Record<string, string>,
  options: StoreRequestOptions = {}
): Promise<StoreResponse<T>> {
  return requestStore<T>(store, path, queryParams, options);
}

