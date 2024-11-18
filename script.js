// script.js

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions to match its displayed size
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();

// Adjust canvas size on window resize for responsiveness
window.addEventListener('resize', () => {
    resizeCanvas();
    // Reinitialize walls to adjust to new canvas size
    initWalls();
});

// Game Variables
let gameSpeed = 2;
let gameFrame = 0;
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20, // Adjusted radius to accommodate images
    color: '#4caf50',
    dx: 0,
    dy: 0
};

const keys = {
    left: false,
    right: false
};

let walls = [];
const wallSegmentHeight = 100;
const initialWallWidth = canvas.width * 0.6;
let currentWallWidth = initialWallWidth;

const healthyItems = [];
const obstacles = [];

let score = 0;
let healthScore = 100;

// Image Preloading
const goodImages = [];
const badImages = [];

// Function to preload images
function preloadImages(imageArray, path, prefix, count) {
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${path}/${prefix}${i}.png`; // Adjust extension if using .jpg
        imageArray.push(img);
    }
}

// Preload Good Item Images
// Replace '3' with the actual number of good images you have
preloadImages(goodImages, 'images/good', 'good', 3);

// Preload Bad Item Images
// Replace '3' with the actual number of bad images you have
preloadImages(badImages, 'images/bad', 'bad', 3);

// Health Tips
const healthTips = [
    "Fiber helps keep your digestive system healthy.",
    "Stay hydrated by drinking plenty of water.",
    "Regular exercise benefits your colon health.",
    "Limit red meat consumption for better health.",
    "Maintain a balanced diet rich in fruits and vegetables.",
    "Regular screenings can help prevent colon issues."
];
let currentTipIndex = 0;
const healthTipElement = document.getElementById('healthTip');
setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % healthTips.length;
    healthTipElement.textContent = healthTips[currentTipIndex];
}, 5000);

// Event Listeners for Player Control
document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'ArrowRight') keys.right = true;
});

document.addEventListener('keyup', (e) => {
    if(e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'ArrowRight') keys.right = false;
});

// End Game Report Elements
const endGameReport = document.getElementById('endGameReport');
const reportText = document.getElementById('reportText');
const restartButton = document.getElementById('restartButton');

restartButton.addEventListener('click', () => {
    resetGame();
    endGameReport.classList.add('hidden');
});

// Utility Functions
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function showMessage(message) {
    // Optional: Implement in-game messages if needed
    // Currently, all educational content is in the sidebar
}

// Classes
class Wall {
    constructor(y, width) {
        this.y = y;
        this.width = width;
        this.left = (canvas.width - this.width) / 2;
        this.right = this.left + this.width;
    }

    update(speed) {
        this.y += speed;
    }

    draw() {
        ctx.fillStyle = '#a5d6a7';
        ctx.fillRect(this.left, this.y, this.width, wallSegmentHeight);
    }
}

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = 20; // Adjusted radius to accommodate images
        this.type = type; // 'healthy' or 'unhealthy'
        this.collected = false;

        if (type === 'healthy') {
            const randomIndex = Math.floor(Math.random() * goodImages.length);
            this.image = goodImages[randomIndex];
        } else if (type === 'unhealthy') {
            const randomIndex = Math.floor(Math.random() * badImages.length);
            this.image = badImages[randomIndex];
        }

        // Optionally, set image dimensions
        this.width = 40; // Adjust as needed
        this.height = 40; // Adjust as needed
    }

    update(speed) {
        this.y += speed;
    }

    draw() {
        if (this.image.complete) { // Ensure image is loaded
            ctx.drawImage(this.image, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            // Fallback: Draw a colored circle if image isn't loaded
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'healthy' ? '#ffeb3b' : '#e57373';
            ctx.fill();
            ctx.closePath();
        }
    }
}

// Initialize Walls
function initWalls() {
    walls = [];
    for(let i = 0; i < canvas.height / wallSegmentHeight + 2; i++) {
        const y = i * wallSegmentHeight;
        const width = initialWallWidth;
        walls.push(new Wall(y, width));
    }
}

// Get Wall Width at a Specific Y Position
function getWallWidthAtY(yPosition) {
    // Since walls are equally spaced and scroll down, calculate the corresponding wall segment
    // Determine the relative y position
    const relativeY = yPosition + (gameFrame * gameSpeed);
    const segmentIndex = Math.floor(relativeY / wallSegmentHeight);
    if(segmentIndex >= walls.length) {
        // If beyond current walls, return the last wall's width
        return walls[walls.length -1].width;
    } else if(segmentIndex < 0) {
        // If above current walls, return the first wall's width
        return walls[0].width;
    } else {
        return walls[segmentIndex].width;
    }
}

// Get Wall at Player's Y Position
function getWallAtY(yPosition) {
    for(let wall of walls) {
        if(yPosition >= wall.y && yPosition < wall.y + wallSegmentHeight) {
            return wall;
        }
    }
    return null;
}

// Spawn Items and Obstacles within Colon Boundaries
function spawnEntities() {
    if(gameFrame % 100 === 0) {
        // Spawn Healthy Item
        const spawningY = -20;
        const wallWidthAtSpawning = getWallWidthAtY(spawningY);
        const itemRadius = 20; // Should match Item.radius
        const minX = canvas.width / 2 - wallWidthAtSpawning / 2 + itemRadius;
        const maxX = canvas.width / 2 + wallWidthAtSpawning / 2 - itemRadius;
        const x = randomRange(minX, maxX);
        const y = spawningY;
        healthyItems.push(new Item(x, y, 'healthy'));
    }

    if(gameFrame % 150 === 0) {
        // Spawn Unhealthy Obstacle
        const spawningY = -20;
        const wallWidthAtSpawning = getWallWidthAtY(spawningY);
        const obstacleRadius = 20; // Should match Item.radius
        const minX = canvas.width / 2 - wallWidthAtSpawning / 2 + obstacleRadius;
        const maxX = canvas.width / 2 + wallWidthAtSpawning / 2 - obstacleRadius;
        const x = randomRange(minX, maxX);
        const y = spawningY;
        obstacles.push(new Item(x, y, 'unhealthy'));
    }
}

// Collision Detection
function detectCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
}

// Update Player Position
function updatePlayer() {
    const speed = 4;
    if(keys.left) {
        player.x -= speed;
        // Prevent moving beyond canvas edges; actual boundary handled separately
        if(player.x - player.radius < 0) player.x = player.radius;
    }
    if(keys.right) {
        player.x += speed;
        if(player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;
    }

    // Boundary Detection: Check if player is within the current colon boundaries
    const playerY = player.y;
    const wallAtPlayerY = getWallAtY(playerY);
    if(wallAtPlayerY) {
        const minX = wallAtPlayerY.left + player.radius;
        const maxX = wallAtPlayerY.right - player.radius;
        if(player.x < minX || player.x > maxX) {
            endGame();
        }
    }
}

// Update Walls
function updateWalls() {
    walls.forEach(wall => wall.update(gameSpeed));
    // Remove walls that are out of view
    if(walls[0].y > canvas.height) {
        walls.shift();
        // Create new wall with possible width variation
        let newWidth = currentWallWidth + randomRange(-50, 50);
        newWidth = Math.max(200, Math.min(newWidth, canvas.width - 100));
        currentWallWidth = newWidth;
        const lastWall = walls[walls.length -1];
        walls.push(new Wall(lastWall.y - wallSegmentHeight, currentWallWidth));
    }
}

// Update Items and Obstacles
function updateEntities() {
    healthyItems.forEach(item => {
        item.update(gameSpeed);
    });
    obstacles.forEach(obstacle => {
        obstacle.update(gameSpeed);
    });

    // Check for collection
    for(let i = healthyItems.length -1; i >=0; i--){
        const item = healthyItems[i];
        if(detectCollision(player, item)) {
            score += 10;
            healthScore = Math.min(healthScore + 5, 100);
            // Optionally, implement in-game messages or feedback
            healthyItems.splice(i,1);
        } else if(item.y - item.radius > canvas.height) {
            healthyItems.splice(i,1);
        }
    }

    // Check for obstacles
    for(let i = obstacles.length -1; i >=0; i--){
        const obstacle = obstacles[i];
        if(detectCollision(player, obstacle)) {
            healthScore -= 10;
            obstacles.splice(i,1);
            if(healthScore <=0) endGame();
        } else if(obstacle.y - obstacle.radius > canvas.height) {
            obstacles.splice(i,1);
        }
    }
}

// Draw Player
function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI *2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
}

// Draw Walls
function drawWalls() {
    walls.forEach(wall => wall.draw());
}

// Draw Items
function drawItems() {
    healthyItems.forEach(item => item.draw());
    obstacles.forEach(obstacle => obstacle.draw());
}

// Draw Score and Health
function drawHUD() {
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Health: ${healthScore}`, 10, 60);
}

// End Game Function
function endGame() {
    cancelAnimationFrame(animationId);
    // Generate Health Report
    let report = `Your Score: ${score}\nHealth Score: ${healthScore}\n`;
    report += healthScore >=80 ? "Great job! Keep maintaining your healthy habits." :
              healthScore >=50 ? "Good effort! Consider improving some of your habits." :
              "Your health score is low. It's important to consult a healthcare professional.";

    reportText.textContent = report;
    endGameReport.classList.remove('hidden');
}

// Reset Game
function resetGame() {
    gameSpeed = 2;
    gameFrame = 0;
    player.x = canvas.width /2;
    player.y = canvas.height /2;
    score = 0;
    healthScore = 100;
    walls = [];
    healthyItems.length =0;
    obstacles.length =0;
    currentWallWidth = initialWallWidth;
    initWalls();
    animate();
}

// Animation Loop
let animationId;
function animate() {
    ctx.clearRect(0,0, canvas.width, canvas.height);

    // Draw Walls
    drawWalls();

    // Update and Draw Entities
    spawnEntities();
    updateWalls();
    updatePlayer();
    updateEntities();
    drawPlayer();
    drawItems();
    drawHUD();

    // Increase game speed gradually
    gameSpeed += 0.0005;
    gameFrame++;

    animationId = requestAnimationFrame(animate);
}

// Initialize Game
initWalls();
animate();
