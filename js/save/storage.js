/**
 * Game Save System
 * Handles world persistence
 */

class GameSaveSystem {
    constructor() {
        this.dbName = 'VoxelSandbox';
        this.storeName = 'worlds';
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    async saveWorld(worldName, worldData) {
        if (!this.db) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const data = {
                id: worldName,
                name: worldName,
                seed: worldData.seed,
                gamemode: worldData.gamemode,
                playerX: worldData.playerX,
                playerY: worldData.playerY,
                playerZ: worldData.playerZ,
                inventory: worldData.inventory,
                timestamp: Date.now(),
                chunks: worldData.chunks || {}
            };

            const request = store.put(data);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async loadWorld(worldName) {
        if (!this.db) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(worldName);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getWorlds() {
        if (!this.db) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async deleteWorld(worldName) {
        if (!this.db) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(worldName);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

// Global save system
const gameSaveSystem = new GameSaveSystem();
