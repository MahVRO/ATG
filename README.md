# 🎮 AllTheGames

A collection of **2D and 3D games** built with pure web technologies. Play them all in your browser!

## 🚀 Getting Started

### Local Development

1. Clone or download this project
2. Open `index.html` in your browser (or use Live Server in VS Code)
3. Start playing games!

### Host on GitHub Pages

1. Push this repo to GitHub
2. Go to Settings → Pages → Set source to `main` branch
3. Your games will be live at `https://yourusername.github.io/allthegames`

## 🎮 Games Included

### 2D Games
- **Flappy Bird** - Classic flappy bird clone with Canvas
- **Snake** - Retro snake game

### 3D Games
- **3D Cube** - Interactive rotating cube with Three.js
- **Planet Explorer** - Explore a 3D planet world

## 📁 Project Structure

```
allthegames/
├── index.html           # Main landing page
├── css/
│   └── style.css       # Global styles
├── js/
│   └── gameManager.js  # Game loading and management
├── games/
│   ├── 2d/            # 2D games
│   │   ├── flappy-bird/
│   │   └── snake/
│   └── 3d/            # 3D games
│       ├── cube-viewer/
│       └── planet-explorer/
└── assets/            # Shared images, sounds, models
```

## 🛠️ How to Add a New Game

### Add a 2D Game (Canvas)

1. Create a folder in `games/2d/your-game-name/`
2. Create `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Game</title>
    <style>
        body { margin: 0; overflow: hidden; background: #222; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script src="game.js"></script>
</body>
</html>
```

3. Create `game.js` with your game logic
4. Update `js/gameManager.js` - add your game to the `GAMES` array

### Add a 3D Game (Three.js)

1. Create a folder in `games/3d/your-game-name/`
2. Create `index.html` with Three.js setup:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your 3D Game</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="game.js"></script>
</body>
</html>
```

3. Create `game.js` with your Three.js logic
4. Update `js/gameManager.js` - add your game to the `GAMES` array

## 📝 Game Template Example (2D Canvas)

```javascript
// games/2d/your-game-name/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;

function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    // Update game state
    
    requestAnimationFrame(gameLoop);
}

// Handle controls
window.addEventListener('keydown', (e) => {
    // Handle input
});

// Start the game
gameLoop();
```

## 📝 Game Template Example (3D Three.js)

```javascript
// games/3d/your-game-name/game.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create objects
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

animate();
```

## 🎨 Customization

- Edit `css/style.css` to change colors and styling
- Update the hero section in `index.html` 
- Modify `GAMES` array in `js/gameManager.js` to change game listings

## 🚀 Technologies Used

- **HTML5 Canvas** - 2D games
- **Three.js** - 3D games
- **Vanilla JavaScript** - Game logic
- **CSS3** - Styling and animations

## 📦 Dependencies

None required for local development! All libraries are loaded via CDN.

## 🎯 Future Ideas

- Add high score tracking (localStorage)
- Create game leaderboards
- Add sound effects and music
- Build multiplayer games with WebSockets
- Add mobile touch controls
- Create level editors for games
- Add game achievements

## 📄 License

Feel free to use, modify, and share!

---

**Let's make some cool games! 🎮**
