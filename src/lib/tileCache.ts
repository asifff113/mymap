const DB_NAME = 'mapTileCache';
const DB_VERSION = 1;
const STORE_NAME = 'tiles';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

interface TileData {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

class TileCacheDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get(url: string): Promise<Blob | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as TileData | undefined;
        resolve(result?.blob || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async put(url: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    const tileData: TileData = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(tileData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const tiles = request.result as TileData[];
        const totalSize = tiles.reduce((sum, tile) => sum + tile.size, 0);
        resolve(totalSize);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async pruneOldTiles(targetSize: number): Promise<void> {
    if (!this.db) await this.init();

    const currentSize = await this.getCacheSize();
    if (currentSize <= targetSize) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let deletedSize = 0;
      const sizeToDelete = currentSize - targetSize;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor && deletedSize < sizeToDelete) {
          const tile = cursor.value as TileData;
          cursor.delete();
          deletedSize += tile.size;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

const tileCacheDB = new TileCacheDB();

export async function cacheTile(url: string): Promise<void> {
  try {
    const cachedBlob = await tileCacheDB.get(url);
    if (cachedBlob) return;

    const response = await fetch(url);
    if (!response.ok) return;

    const blob = await response.blob();
    
    const currentSize = await tileCacheDB.getCacheSize();
    if (currentSize + blob.size > MAX_CACHE_SIZE) {
      await tileCacheDB.pruneOldTiles(MAX_CACHE_SIZE * 0.8);
    }

    await tileCacheDB.put(url, blob);
  } catch (error) {
    console.warn('Failed to cache tile:', error);
  }
}

export async function getCachedTile(url: string): Promise<string | null> {
  try {
    const blob = await tileCacheDB.get(url);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.warn('Failed to get cached tile:', error);
    return null;
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    return await tileCacheDB.getCacheSize();
  } catch (error) {
    console.warn('Failed to get cache size:', error);
    return 0;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await tileCacheDB.clear();
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

export function getTileUrls(
  bounds: { north: number; south: number; east: number; west: number },
  minZoom: number,
  maxZoom: number,
  tileServerUrl: string
): string[] {
  const urls: string[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const latToTileY = (lat: number) => {
      const latRad = (lat * Math.PI) / 180;
      return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    };
    const lngToTileX = (lng: number) => Math.floor(((lng + 180) / 360) * n);

    const xMin = Math.max(0, lngToTileX(bounds.west));
    const xMax = Math.min(n - 1, lngToTileX(bounds.east));
    const yMin = Math.max(0, latToTileY(bounds.north));
    const yMax = Math.min(n - 1, latToTileY(bounds.south));

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const url = tileServerUrl.replace('{z}', z.toString()).replace('{x}', x.toString()).replace('{y}', y.toString());
        urls.push(url);
      }
    }
  }

  return urls;
}

export async function downloadAreaTiles(
  bounds: { north: number; south: number; east: number; west: number },
  currentZoom: number,
  tileServerUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const minZoom = Math.max(0, Math.floor(currentZoom) - 1);
  const maxZoom = Math.min(15, Math.floor(currentZoom) + 2);
  
  const urls = getTileUrls(bounds, minZoom, maxZoom, tileServerUrl);
  let completed = 0;

  for (const url of urls) {
    await cacheTile(url);
    completed++;
    if (onProgress) {
      onProgress((completed / urls.length) * 100);
    }
  }
}

export { MAX_CACHE_SIZE };
