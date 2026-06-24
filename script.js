function onFullyLoaded(callback) {
    if (document.readyState === 'complete') {
        // Already fully loaded
        callback();
    } else {
        window.addEventListener('load', callback);
    }
}

onFullyLoaded(() => {
    document.querySelector('.loading').classList.add('loaded');
});

let currentPage = q1;

function setDisplay(el, display) {
    el.style.display = display ? "" : "none";
}

function goto(el) {
    setDisplay(currentPage, false);
    setDisplay(el, true);
    currentPage = el;
}

setDisplay(currentPage, true);



/// game



const STEP_SIZE = 3;           // pixels per move step (smooth movement)
const CHARACTER_SIZE = 32;     // character image size (will be scaled to this)

// ─── STATE ──────────────────────────────────────────────────────────────────

let canvas, ctx;
let bgImage = null;            // background image (displayed)
let wallMapCanvas = null;      // offscreen canvas holding wall map pixel data
let wallMapData = null;        // ImageData for wall map
let charImage = null;          // character sprite image

// Player position (top‑left corner of character, in canvas coordinates)
let player = {
    cx: 25, cy: 450,
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
    // direction flags – set true while button is held
    movingUp: false,
    movingDown: false,
    movingLeft: false,
    movingRight: false,
};

let isMoving = false;          // true when a movement key is held (or step queued)
let animationId = null;

// ─── WALL MAP LOADING ──────────────────────────────────────────────────────

/**
 * Load a wall map image into an offscreen canvas and extract pixel data.
 * @param {HTMLImageElement} img - The black‑and‑white wall map image.
 * @param {number} canvasWidth  - Target width of the canvas (for scaling).
 * @param {number} canvasHeight - Target height of the canvas.
 * @returns {ImageData} pixel data (0‑255 per channel) for collision.
 */
function loadWallMap(img, canvasWidth, canvasHeight) {
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const offCtx = offscreen.getContext('2d');
    // Draw the image stretched to the canvas size
    offCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    wallMapCanvas = offscreen;
    wallMapData = offCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    return wallMapData;
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────

/**
 * Check if a given pixel (x, y) is a wall.
 * @param {number} x - X coordinate (canvas pixels)
 * @param {number} y - Y coordinate (canvas pixels)
 * @returns {boolean} true if wall, false if walkable.
 */
function isWallPixel(x, y) {
    if (!wallMapData) return false;
    const w = wallMapData.width;
    const h = wallMapData.height;
    // Clamp to image bounds
    const ix = Math.min(Math.max(Math.floor(x), 0), w - 1);
    const iy = Math.min(Math.max(Math.floor(y), 0), h - 1);
    const idx = (iy * w + ix) * 4;
    // Check red channel: black = 0, white = 255 (or use grayscale)
    return wallMapData.data[idx] < 128; // threshold
}

/**
 * Check if the character's bounding box collides with any wall.
 * Uses four corners (or more) to avoid tunnelling.
 * @param {number} newX - Proposed top‑left X
 * @param {number} newY - Proposed top‑left Y
 * @param {number} w    - Character width
 * @param {number} h    - Character height
 * @returns {boolean} true if any part is inside a wall.
 */
function collidesWithWall(cx, cy, w, h) {
    const halfW = w / 2;
    const halfH = h / 2;
    const corners = [
        [cx - halfW, cy - halfH],
        [cx + halfW - 1, cy - halfH],
        [cx - halfW, cy + halfH - 1],
        [cx + halfW - 1, cy + halfH - 1],
        [cx, cy - halfH],        // optional mid‑points
        [cx, cy + halfH - 1],
        [cx - halfW, cy],
        [cx + halfW - 1, cy],
    ];
    for (const [px, py] of corners) {
        if (isWallPixel(px, py)) return true;
    }
    return false;
}

// ─── INITIALISATION ──────────────────────────────────────────────────────

/**
 * Initialise the game.
 * @param {HTMLCanvasElement} canvasElement - The canvas to draw on.
 * @param {HTMLImageElement} bgImg         - The background image (labyrinth visual).
 * @param {HTMLImageElement} wallImg       - Black‑and‑white wall map (same size as bg).
 * @param {HTMLImageElement} charImg       - Character sprite image.
 * @param {number} startX                  - Starting X position (default: 20).
 * @param {number} startY                  - Starting Y position (default: 20).
 */
function initGame(canvasElement, bgImg, wallImg, charImg, startX = 20, startY = 20) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    bgImage = bgImg;
    charImage = charImg;

    // Load wall map into offscreen canvas
    loadWallMap(wallImg, w, h);

    // Set player position (ensure it's not inside a wall)
    player.x = startX;
    player.y = startY;
    player.width = CHARACTER_SIZE;
    player.height = CHARACTER_SIZE;
    player.moveX = 0;
    player.moveY = 0;

    // If start position is in a wall, move to nearest walkable pixel (optional)
    if (collidesWithWall(player.x, player.y, player.width, player.height)) {
        // Simple fallback: find a clear spot near (10,10)
        for (let y = 10; y < h - 20; y += 10) {
            for (let x = 10; x < w - 20; x += 10) {
                if (!collidesWithWall(x, y, player.width, player.height)) {
                    player.x = x;
                    player.y = y;
                    break;
                }
            }
            if (!collidesWithWall(player.x, player.y, player.width, player.height)) break;
        }
    }

    isMoving = false;
    if (animationId) cancelAnimationFrame(animationId);
    renderLoop();
}

// ─── MOVEMENT FUNCTIONS (call these from buttons) ──────────────────────

/**
 * Request a movement step.
 * This is called by the movement functions; it stores the intended delta
 * and the render loop will apply it step by step.
 * @param {number} dx - pixel delta X
 * @param {number} dy - pixel delta Y
 */
function startMoveUp()    { player.movingUp = true; }
function stopMoveUp()     { player.movingUp = false; }
function startMoveDown()  { player.movingDown = true; }
function stopMoveDown()   { player.movingDown = false; }
function startMoveLeft()  { player.movingLeft = true; }
function stopMoveLeft()   { player.movingLeft = false; }
function startMoveRight() { player.movingRight = true; }
function stopMoveRight()  { player.movingRight = false; }

// ─── RENDER LOOP ─────────────────────────────────────────────────────────

function renderLoop() {
    if (!ctx) return;
    update();
    render();
    animationId = requestAnimationFrame(renderLoop);
}

/**
 * Update game state: apply movement if possible.
 */
function update() {
    let dx = 0, dy = 0;
    if (player.movingUp)    dy -= STEP_SIZE;
    if (player.movingDown)  dy += STEP_SIZE;
    if (player.movingLeft)  dx -= STEP_SIZE;
    if (player.movingRight) dx += STEP_SIZE;

    if (dx === 0 && dy === 0) return; // no movement

    const newCx = player.cx + dx;
    const newCy = player.cy + dy;

    // Clamp center to keep the sprite inside the canvas
    const halfW = player.width/2;
    const halfH = player.height/2;
    const maxX = canvas.width - halfW;
    const maxY = canvas.height - halfH;
    const clampedX = Math.min(Math.max(newCx, halfW), maxX);
    const clampedY = Math.min(Math.max(newCy, halfH), maxY);

    if (!collidesWithWall(clampedX, clampedY, player.width, player.height)) {
        player.cx = clampedX;
        player.cy = clampedY;
    } else {
        // Wall hit – call your placeholder and optionally try sliding
        onWallHit(clampedX, clampedY, dx, dy);
        // To allow sliding, you can try moving only X or only Y separately
        // (similar to earlier sliding logic)
    }
}

/**
 * Render the background and character.
 */
function render() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw background image (stretched to canvas)
    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, w, h);
    } else {
        // Fallback: fill with a colour (but user said no colours, so we keep it transparent)
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, w, h);
    }

    // Draw character (centered at player.x, player.y with size)
    if (charImage) {
        const x = player.cx - player.width/2;
        const y = player.cy - player.height/2;
        ctx.drawImage(charImage, x, y, player.width, player.height);
    } else {
        // Fallback: draw a circle
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(player.cx, player.cy, player.width/2, 0, 2*Math.PI);
        ctx.fill();
    }
}

// ─── WALL‑HIT PLACEHOLDER ──────────────────────────────────────────────

/**
 * Called when the player attempts to move into a wall.
 * @param {number} newX - The X coordinate that would be occupied.
 * @param {number} newY - The Y coordinate that would be occupied.
 * @param {number} dx   - The attempted X movement delta.
 * @param {number} dy   - The attempted Y movement delta.
 */
function onWallHit(newX, newY, dx, dy) {
    // ─── INSERT YOUR CUSTOM LOGIC HERE ──────────────────────────────
    console.log(`Wall hit at (${newX}, ${newY}) moving (${dx}, ${dy})`);
    // Example: flash the canvas border red
    if (canvas) {
        canvas.style.boxShadow = 'inset 0 0 40px rgba(255,0,0,0.6)';
        setTimeout(() => { canvas.style.boxShadow = 'none'; }, 150);
    }
    // ──────────────────────────────────────────────────────────────────
}

// ─── STOP / CLEANUP ─────────────────────────────────────────────────────

function stopGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

setTimeout(() => {
    initGame(document.querySelector('canvas'), document.getElementById('bgImage'), document.getElementById('wallMapImage'), document.getElementById('charImage'));
}, 3000);
