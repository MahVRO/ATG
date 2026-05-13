/**
 * UI Manager
 * Handles all UI rendering
 */

class UIManager {
    constructor() {
        this.container = null;
        this.hudElements = {};
        this.isPaused = false;
        this.showDebug = false;
    }

    initialize(container) {
        this.container = container;
        this.createHUD();
    }

    createHUD() {
        // Hotbar
        const hotbar = document.createElement('div');
        hotbar.id = 'hotbar';
        hotbar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 4px;
            background: rgba(0,0,0,0.6);
            padding: 8px;
            border: 2px solid #333;
            border-radius: 4px;
            z-index: 10;
        `;
        this.container.appendChild(hotbar);
        this.hudElements.hotbar = hotbar;

        // Crosshair
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        crosshair.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            border: 2px solid white;
            border-radius: 2px;
            z-index: 5;
        `;
        this.container.appendChild(crosshair);

        // Info panel
        const info = document.createElement('div');
        info.id = 'info-panel';
        info.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0,0,0,0.7);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #0f0;
            z-index: 10;
        `;
        this.container.appendChild(info);
        this.hudElements.info = info;

        // Pause menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100;
        `;
        pauseMenu.innerHTML = `
            <h1 style="color: white; font-size: 48px; margin-bottom: 40px;">PAUSED</h1>
            <button id="resume-btn" style="padding: 12px 24px; margin: 10px; font-size: 16px;">Resume</button>
            <button id="settings-btn" style="padding: 12px 24px; margin: 10px; font-size: 16px;">Settings</button>
            <button id="menu-btn" style="padding: 12px 24px; margin: 10px; font-size: 16px;">Main Menu</button>
        `;
        this.container.appendChild(pauseMenu);
        this.hudElements.pauseMenu = pauseMenu;
    }

    updateHotbar(inventory) {
        const hotbar = this.hudElements.hotbar;
        hotbar.innerHTML = '';

        const items = inventory.getHotbarItems();
        for (let i = 0; i < items.length; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 40px;
                height: 40px;
                border: 2px solid ${i === inventory.selectedSlot ? '#0f0' : '#666'};
                background: rgba(100,100,100,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: white;
                cursor: pointer;
            `;

            const item = items[i];
            if (item) {
                const block = BLOCK_REGISTRY.getBlock(item.blockId);
                slot.innerHTML = `
                    <div style="text-align: center;">
                        <div>${block ? block.name.charAt(0) : '?'}</div>
                        <div style="font-size: 10px;">${item.count}</div>
                    </div>
                `;
            }

            slot.addEventListener('click', () => {
                if (window.gameInstance) {
                    inventory.selectSlot(i);
                }
            });

            hotbar.appendChild(slot);
        }
    }

    updateInfo(physics, stats) {
        const info = this.hudElements.info;
        const x = physics.position.x.toFixed(1);
        const y = physics.position.y.toFixed(1);
        const z = physics.position.z.toFixed(1);

        let text = `X: ${x} Y: ${y} Z: ${z}\n`;
        text += `FPS: ${stats.fps}\n`;
        text += `Mode: ${physics.isFlying ? 'Flying' : 'Walking'}\n`;
        text += `Grounded: ${physics.isGrounded ? 'Yes' : 'No'}`;

        if (this.showDebug) {
            text += `\nChunks Loaded: ${window.gameInstance?.chunkManager?.chunks?.size || 0}`;
        }

        info.textContent = text;
    }

    togglePauseMenu(show) {
        this.isPaused = show;
        this.hudElements.pauseMenu.style.display = show ? 'flex' : 'none';
    }

    toggleDebug() {
        this.showDebug = !this.showDebug;
    }
}
