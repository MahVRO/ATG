/**
 * Inventory System
 */

class InventoryItem {
    constructor(blockId, count = 1) {
        this.blockId = blockId;
        this.count = Math.min(count, 64);
    }

    canStack(other) {
        return this.blockId === other.blockId;
    }

    add(count) {
        this.count = Math.min(this.count + count, 64);
        return this.count === 64 ? 0 : count - (64 - this.count);
    }
}

class Inventory {
    constructor() {
        this.hotbarSize = 9;
        this.inventorySize = 27;
        this.hotbar = [];
        this.inventory = [];
        this.selectedSlot = 0;

        this.initializeInventory();
    }

    initializeInventory() {
        // Initialize hotbar
        for (let i = 0; i < this.hotbarSize; i++) {
            this.hotbar.push(null);
        }

        // Initialize inventory
        for (let i = 0; i < this.inventorySize; i++) {
            this.inventory.push(null);
        }

        // Add starting items
        this.hotbar[0] = new InventoryItem(BLOCK_REGISTRY.getBlockId('grass_soil'), 64);
        this.hotbar[1] = new InventoryItem(BLOCK_REGISTRY.getBlockId('stone'), 64);
        this.hotbar[2] = new InventoryItem(BLOCK_REGISTRY.getBlockId('wood_log'), 32);
        this.hotbar[3] = new InventoryItem(BLOCK_REGISTRY.getBlockId('leaves'), 32);
        this.hotbar[4] = new InventoryItem(BLOCK_REGISTRY.getBlockId('sand_block'), 64);
    }

    selectSlot(index) {
        if (index >= 0 && index < this.hotbarSize) {
            this.selectedSlot = index;
            return true;
        }
        return false;
    }

    getSelectedItem() {
        return this.hotbar[this.selectedSlot];
    }

    getSelectedBlockId() {
        const item = this.getSelectedItem();
        return item ? item.blockId : 0;
    }

    removeSelectedBlock() {
        const item = this.getSelectedItem();
        if (item && item.count > 0) {
            item.count--;
            if (item.count === 0) {
                this.hotbar[this.selectedSlot] = null;
            }
            return true;
        }
        return false;
    }

    addBlock(blockId, count = 1) {
        // Try hotbar first
        for (let i = 0; i < this.hotbarSize; i++) {
            if (this.hotbar[i] && this.hotbar[i].blockId === blockId) {
                const remaining = count - this.hotbar[i].add(count);
                if (remaining === 0) return 0;
                count = remaining;
            }
        }

        // Add to empty hotbar slot
        for (let i = 0; i < this.hotbarSize; i++) {
            if (!this.hotbar[i]) {
                this.hotbar[i] = new InventoryItem(blockId, count);
                return 0;
            }
        }

        // Try inventory
        for (let i = 0; i < this.inventorySize; i++) {
            if (this.inventory[i] && this.inventory[i].blockId === blockId) {
                const remaining = count - this.inventory[i].add(count);
                if (remaining === 0) return 0;
                count = remaining;
            }
        }

        // Add to empty inventory slot
        for (let i = 0; i < this.inventorySize; i++) {
            if (!this.inventory[i]) {
                this.inventory[i] = new InventoryItem(blockId, count);
                return 0;
            }
        }

        return count; // Couldn't store
    }

    getHotbarItems() {
        return this.hotbar;
    }

    getTotalBlockCount(blockId) {
        let total = 0;
        for (const item of this.hotbar) {
            if (item && item.blockId === blockId) {
                total += item.count;
            }
        }
        for (const item of this.inventory) {
            if (item && item.blockId === blockId) {
                total += item.count;
            }
        }
        return total;
    }
}
