// Game variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = new Image();
const gameOverScreen = new Image();
const background = new Image();
const birdImg = new Image(); // This will be our Aero plane
const pipeNorth = new Image();
const pipeSouth = new Image();

// Load images
background.src = 'assets/images/background.png';
birdImg.src = 'assets/images/aero_plane.png'; // Changed from bird.png to aero_plane.png
pipeNorth.src = 'assets/images/pipe.png';
pipeSouth.src = 'assets/images/pipe.png';
startScreen.src = 'assets/images/start.png';
gameOverScreen.src = 'assets/images/gameover.png';

// Sound effects
const sounds = {
    flap: new Audio('assets/sounds/flap.wav'),
    hit: new Audio('assets/sounds/hit.wav'),
    point: new Audio('assets/sounds/point.wav'),
    swoosh: new Audio('assets/sounds/swoosh.wav')
};

// Game constants
const GRAVITY = 0.25;
const JUMP_FORCE = -5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 120;
const PIPE_SPEED = 2;
const PIPE_FREQUENCY = 1500; // milliseconds

// Game variables
let bird = {
    x: 50,
    y: canvas.height / 2,
    width: 34,
    height: 24,
    velocity: 0
};

let pipes = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameStarted = false;
let gameOver = false;
let lastPipeTime = 0;
let gameLoopId;
let touchStartY = 0;

// Initialize AdMob (replace with your AdMob IDs)
function initAdMob() {
    if (window.adsbygoogle) {
        const adContainer = document.getElementById('ad-container');
        adContainer.innerHTML = `
            <ins class="adsbygoogle"
                style="display:block"
                data-ad-client="ca-pub-YOUR_ADMOB_PUBLISHER_ID"
                data-ad-slot="YOUR_ADMOB_SLOT_ID"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        `;
    }
}

// Initialize game
function init() {
    initAdMob();
    resetGame();
    drawStartScreen();
    addEventListeners();
}

// Reset game state
function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    lastPipeTime = 0;
}

// Draw start screen
function drawStartScreen() {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(startScreen, (canvas.width - startScreen.width) / 2, (canvas.height - startScreen.height) / 2);
    
    ctx.fillStyle = "#FFF";
    ctx.font = "20px Arial";
    ctx.fillText("High Score: " + highScore, 10, 30);
}

// Draw game over screen
function drawGameOverScreen() {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(gameOverScreen, (canvas.width - gameOverScreen.width) / 2, (canvas.height - gameOverScreen.height) / 2);
    
    ctx.fillStyle = "#FFF";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("High Score: " + highScore, 10, 60);
    
    // Show interstitial ad when game over
    if (window.adsbygoogle) {
        const adScript = document.createElement('script');
        adScript.innerHTML = `
            (adsbygoogle = window.adsbygoogle || []).push({
                google_ad_client: "ca-pub-YOUR_ADMOB_PUBLISHER_ID",
                enable_page_level_ads: true
            });
        `;
        document.body.appendChild(adScript);
    }
}

// Draw game elements
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    // Draw pipes
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        ctx.drawImage(pipeNorth, pipe.x, pipe.y, pipe.width, pipe.height);
        ctx.drawImage(pipeSouth, pipe.x, pipe.y + pipe.height + PIPE_GAP, pipe.width, pipe.height);
    }
    
    // Draw bird (Aero plane)
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    let rotationAngle = Math.min(Math.max(bird.velocity * 5, -30), 30);
    ctx.rotate(rotationAngle * Math.PI / 180);
    ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();
    
    // Draw score
    ctx.fillStyle = "#FFF";
    ctx.font = "30px Arial";
    ctx.fillText(score.toString(), canvas.width / 2 - 10, 50);
    
    if (gameOver) {
        drawGameOverScreen();
    }
}

// Update game state
function update() {
    if (!gameStarted || gameOver) return;
    
    // Update bird position
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    
    // Generate new pipes
    const currentTime = Date.now();
    if (currentTime - lastPipeTime > PIPE_FREQUENCY) {
        generatePipe();
        lastPipeTime = currentTime;
    }
    
    // Update pipes
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= PIPE_SPEED;
        
        // Check for collision
        if (
            bird.x + bird.width > pipes[i].x &&
            bird.x < pipes[i].x + pipes[i].width &&
            (bird.y < pipes[i].y + pipes[i].height ||
             bird.y + bird.height > pipes[i].y + pipes[i].height + PIPE_GAP)
        ) {
            gameOver = true;
            sounds.hit.play();
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
            }
            return;
        }
        
        // Check if bird passed the pipe
        if (pipes[i].x + pipes[i].width < bird.x && !pipes[i].passed) {
            pipes[i].passed = true;
            score++;
            sounds.point.play();
        }
        
        // Remove pipes that are off screen
        if (pipes[i].x + pipes[i].width < 0) {
            pipes.splice(i, 1);
            i--;
        }
    }
    
    // Check if bird hit the ground or ceiling
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver = true;
        sounds.hit.play();
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
    }
}

// Generate new pipe
function generatePipe() {
    const pipeHeight = Math.floor(Math.random() * (canvas.height - PIPE_GAP - 100)) + 50;
    pipes.push({
        x: canvas.width,
        y: -pipeHeight,
        width: PIPE_WIDTH,
        height: canvas.height,
        passed: false
    });
}

// Game loop
function gameLoop() {
    update();
    draw();
    
    if (!gameOver) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Handle jump
function jump() {
    if (!gameStarted) {
        gameStarted = true;
        sounds.swoosh.play();
        gameLoop();
    }
    
    if (!gameOver) {
        bird.velocity = JUMP_FORCE;
        sounds.flap.play();
    } else {
        resetGame();
        drawStartScreen();
    }
}

// Add event listeners
function addEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === 'ArrowUp') {
            jump();
        }
    });
    
    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartY = e.touches[0].clientY;
        jump();
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });
    
    // Mouse controls
    canvas.addEventListener('mousedown', () => {
        jump();
    });
}

// Start the game when all assets are loaded
window.onload = function() {
    let assetsLoaded = 0;
    const totalAssets = 6; // 5 images + 4 sounds = 9, but we'll count sounds separately
    
    function assetLoaded() {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            init();
        }
    }
    
    background.onload = assetLoaded;
    birdImg.onload = assetLoaded;
    pipeNorth.onload = assetLoaded;
    pipeSouth.onload = assetLoaded;
    startScreen.onload = assetLoaded;
    gameOverScreen.onload = assetLoaded;
    
    // Check if sounds are loaded
    let soundsLoaded = 0;
    for (const sound in sounds) {
        sounds[sound].addEventListener('canplaythrough', () => {
            soundsLoaded++;
            if (soundsLoaded === Object.keys(sounds).length) {
                assetLoaded();
            }
        });
    }
};
