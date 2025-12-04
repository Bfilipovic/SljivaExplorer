/**
 * Store Configuration
 * 
 * Defines the structure and management of multiple Nomin-compatible stores
 * that the Explorer can query.
 */

export interface StoreConfig {
  id: string;
  name: string;
  baseUrl: string;
  publicKey?: string;
  description?: string;
  enabled?: boolean;
  icon?: string; // URL or path to store icon
}

/**
 * Parse store configurations from environment variable.
 * 
 * Expected format: JSON array of store objects:
 * [
 *   { "id": "main", "name": "Main Nomin", "baseUrl": "https://store1.example.com/api/explorer" },
 *   { "id": "test", "name": "Test Store", "baseUrl": "https://teststore.example.com/api/explorer" }
 * ]
 */
function parseStoresFromEnv(): StoreConfig[] {
  const storesEnv = process.env.EXPLORER_STORES;
  
  if (!storesEnv) {
    return getDefaultStores();
  }

  try {
    const parsed = JSON.parse(storesEnv);
    
    if (!Array.isArray(parsed)) {
      console.warn("[Stores Config] EXPLORER_STORES is not an array, using defaults");
      return getDefaultStores();
    }

    const stores: StoreConfig[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) {
        console.warn("[Stores Config] Skipping invalid store entry:", item);
        continue;
      }

      if (!item.id || !item.name || !item.baseUrl) {
        console.warn("[Stores Config] Store missing required fields (id, name, baseUrl):", item);
        continue;
      }

      const baseUrl = String(item.baseUrl).replace(/\/$/, ""); // Remove trailing slash
      
      // Default icon if not specified - construct from baseUrl
      let icon = item.icon ? String(item.icon) : undefined;
      if (!icon) {
        try {
          const url = new URL(baseUrl);
          const protocol = url.protocol || 'https:';
          const hostname = url.hostname;
          
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Default icon for localhost
            const frontendPort = process.env.FRONTEND_PORT || '5173';
            icon = `http://localhost:${frontendPort}/nomin_icon.png`;
          } else {
            // Default icon for production stores: use the store's domain
            // Remove /api/explorer from baseUrl to get the frontend URL
            const frontendBase = baseUrl.replace(/\/api\/explorer.*$/, '');
            icon = `${frontendBase}/nomin_icon.png`;
          }
        } catch {
          // If URL parsing fails, skip default icon
        }
      }

      stores.push({
        id: String(item.id),
        name: String(item.name),
        baseUrl: baseUrl,
        publicKey: item.publicKey ? String(item.publicKey) : undefined,
        description: item.description ? String(item.description) : undefined,
        enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
        icon: icon
      });
    }

    if (stores.length === 0) {
      console.warn("[Stores Config] No valid stores found, using defaults");
      return getDefaultStores();
    }

    return stores;
  } catch (error) {
    console.error("[Stores Config] Failed to parse EXPLORER_STORES:", error);
    return getDefaultStores();
  }
}

/**
 * Get default store configuration for local development.
 */
function getDefaultStores(): StoreConfig[] {
  const mainStorePort = process.env.MAIN_STORE_PORT || "3000";
  const frontendPort = process.env.FRONTEND_PORT || "5173";
  return [
    {
      id: "local",
      name: "Local Nomin",
      baseUrl: `http://localhost:${mainStorePort}/api/explorer`,
      description: "Default local development store",
      enabled: true,
      icon: `http://localhost:${frontendPort}/nomin_icon.png` // Icon is served from frontend static files
    }
  ];
}

// Load and cache store configurations
let cachedStores: StoreConfig[] | null = null;

/**
 * Get all configured stores.
 * Stores are loaded once on first call and cached.
 */
export function getStores(): StoreConfig[] {
  if (cachedStores === null) {
    cachedStores = parseStoresFromEnv();
  }
  return cachedStores.filter(store => store.enabled !== false);
}

/**
 * Get a store by its ID.
 * @param id Store identifier
 * @returns Store configuration or undefined if not found
 */
export function getStoreById(id: string): StoreConfig | undefined {
  const stores = getStores();
  return stores.find(store => store.id === id);
}

/**
 * Initialize store configuration (call on server startup).
 * This will parse and validate stores, logging the results.
 */
export function initializeStores(): void {
  const stores = getStores();
  console.log(`[Stores Config] Loaded ${stores.length} store(s):`);
  stores.forEach(store => {
    console.log(`  - ${store.id}: ${store.name} (${store.baseUrl})`);
  });
}

