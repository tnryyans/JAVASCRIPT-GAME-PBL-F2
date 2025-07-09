// =============================================
// GAME INITIALIZATION AND VARIABLES
// =============================================

// Canvas and UI elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const healthBar = document.getElementById("health-bar");
const healthInner = document.getElementById("health-inner");
const startButton = document.getElementById("startButton");
const gameTitle = document.getElementById("gameTitle");
const creditsButton = document.getElementById("creditsButton");
const creditsPopup = document.getElementById("creditsPopup");
const bulletContainer = document.getElementById("bullet-container");
const levelInstruction = document.getElementById("levelInstruction");
const levelNote = document.getElementById("levelNote");

// Sound elements
const eatSound = document.getElementById("eatSound");
eatSound.volume = 0.7;
const levelUpSound = document.getElementById("levelUpSound");
levelUpSound.volume = 0.8;
const shootSound = document.getElementById("shootSound");
shootSound.volume = 0.6;
const warningSound = document.getElementById("warningSound");
warningSound.volume = 0.9;
const levelUpMp3 = document.getElementById("levelUpMp3");
levelUpMp3.volume = 0.7;

// Canvas dimensions
canvas.width = 1000;
canvas.height = 600;

// Game state variables
let gameRunning = false;
let invincible = false;
let currentLevel = "top";
let lastAteTime = Date.now();
let showingLevelNote = false;
let bossWarningActive = false;
let bossWarningAlpha = 0;
let hasWeapon = false;
let ammo = 0;
let ammoDropInterval = null;
let fishSpawnInterval = null;

// Instruction system variables
const instructionQueue = [];
let currentInstruction = null;
let instructionTimer = 0;
const INSTRUCTION_DURATION = 3000; // 3 seconds per instruction

// =============================================
// GAME OBJECTS AND ASSETS
// =============================================

// Boost meter configuration
const boostMeter = {
    x: 20,
    y: canvas.height - 30,
    width: 200,
    height: 20,
    fill: 100,
    maxFill: 100,
    drainRate: 0.8,
    rechargeRate: 0.3,
    colors: {
        full: "#00ff00",
        medium: "#ffff00",
        low: "#ff0000",
        border: "#666666"
    },
    isVisible: false
};

// Shark images with error handling
const sharkImages = {
    left: createImageWithFallback("shark-left.png", "SHARK", 80, 50),
    right: createImageWithFallback("shark-right.png", "SHARK", 80, 50),
    redLeft: createImageWithFallback("shark-red-left.png", "SHARK", 80, 50),
    redRight: createImageWithFallback("shark-red.png", "SHARK", 80, 50),
    down: createImageWithFallback("shark-down.png", "SHARK", 80, 50),
    withGunLeft: createImageWithFallback("shark-gun-left.png", "SHARK-GUN", 80, 50),
    withGunRight: createImageWithFallback("shark-gun-right.png", "SHARK-GUN", 80, 50)
};

// Fish images by level
const fishImages = {
    top: createImageWithFallback("fish.png", "FISH", 30, 30),
    mid: createImageWithFallback("fish-mid.png", "FISH", 35, 35),
    deep: createImageWithFallback("fish-deep.png", "FISH", 40, 40)
};

// Weapon and ammo images
const weaponImage = createImageWithFallback("laser-gun.png", "GUN", 50, 40);
const ammoImage = createImageWithFallback("ammo.png", "AMMO", 30, 30);
const bulletImage = createImageWithFallback("bullet.png", "BULLET", 24, 24);

// Fish types by level
const fishTypes = {
    top: [
        { size: 30, value: 1 },
        { size: 50, value: 2 },
        { size: 70, value: 3 }
    ],
    mid: [
        { size: 35, value: 1.5 },
        { size: 55, value: 2.5 },
        { size: 75, value: 4 }
    ],
    deep: [
        { size: 40, value: 2 },
        { size: 60, value: 3 },
        { size: 80, value: 5 }
    ]
};

// Boss configuration
const boss = {
    image: createImageWithFallback("boss.png", "BOSS", 200, 150),
    x: canvas.width - 220,
    y: canvas.height / 2 - 75,
    width: 200,
    height: 150,
    speed: 0,
    health: 30,
    maxHealth: 30,
    isActive: false,
    warningShown: false,
    attackPattern: 0
};

// Weapon drop configuration
const weaponDrop = {
    image: weaponImage,
    x: 0,
    y: -100,
    width: 50,
    height: 40,
    speed: 3,
    isActive: false,
    collected: false
};

// Game entities
const ammoDrops = [];
const bullets = [];
let fish = [];
let keys = {};

// Player shark
let shark = {
    x: canvas.width / 2 - 40,
    y: -80,
    width: 80,
    height: 50,
    speed: 4,
    baseSpeed: 4,
    boostSpeed: 5.5,
    score: 0,
    value: 1,
    health: 15,
    image: sharkImages.down,
    direction: "down",
    falling: true,
    isBoosting: false,
    hasWeapon: false
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

function createImageWithFallback(src, placeholderText, width, height) {
    const img = new Image();
    img.src = src;
    img.onerror = function() {
        console.error(`Failed to load image: ${src}`);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(width/placeholderText.length, height/2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(placeholderText, width/2, height/2);
        img.src = canvas.toDataURL();
    };
    return img;
}

function playSound(sound) {
    if (!sound) return;
    try {
        sound.currentTime = 0;
        sound.play().catch(e => console.error(`Sound play failed: ${e}`));
    } catch (e) {
        console.error(`Error playing sound: ${e}`);
    }
}

function updateAmmoUI(ammoCount) {
    const container = document.getElementById('bullet-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < ammoCount; i++) {
        const bulletIcon = document.createElement('img');
        bulletIcon.src = bulletImage.src;
        bulletIcon.style.width = '24px';
        bulletIcon.style.height = '24px';
        bulletIcon.style.filter = 'drop-shadow(0 0 2px yellow)';
        container.appendChild(bulletIcon);
    }
    
    container.style.display = ammoCount > 0 ? 'flex' : 'none';
}

function showRequirementMet(message) {
    const requirementNote = document.createElement('div');
    requirementNote.id = 'requirementNote';
    requirementNote.textContent = message;
    requirementNote.style.position = 'absolute';
    requirementNote.style.bottom = '60px';
    requirementNote.style.left = '50%';
    requirementNote.style.transform = 'translateX(-50%)';
    requirementNote.style.color = 'yellow';
    requirementNote.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    requirementNote.style.padding = '10px 20px';
    requirementNote.style.borderRadius = '8px';
    requirementNote.style.fontSize = '18px';
    requirementNote.style.fontWeight = 'bold';
    requirementNote.style.zIndex = '100';
    requirementNote.style.textShadow = '0 0 5px black';
    requirementNote.style.animation = 'pulse 1s infinite';
    
    document.body.appendChild(requirementNote);
    
    setTimeout(() => {
        requirementNote.style.opacity = '0';
        setTimeout(() => {
            if (requirementNote.parentNode) {
                requirementNote.parentNode.removeChild(requirementNote);
            }
        }, 1000);
    }, 3000);
}

// =============================================
// INSTRUCTION SYSTEM FUNCTIONS
// =============================================

function showInstruction(message, isBoss = false) {
    instructionQueue.push({ message, isBoss });
}

function updateInstructions() {
    if (!currentInstruction && instructionQueue.length > 0) {
        // Show next instruction
        currentInstruction = instructionQueue.shift();
        displayCurrentInstruction();
        instructionTimer = INSTRUCTION_DURATION;
    }
    
    if (currentInstruction) {
        instructionTimer -= 16; // Assuming 60fps
        if (instructionTimer <= 0) {
            levelInstruction.style.display = "none";
            currentInstruction = null;
        }
    }
}

function displayCurrentInstruction() {
    levelInstruction.textContent = currentInstruction.message;
    levelInstruction.style.display = "block";
    levelInstruction.style.top = "20px";
    levelInstruction.style.bottom = "auto";
    levelInstruction.style.transform = "translateX(-50%)";
    
    if (currentInstruction.isBoss) {
        levelInstruction.style.color = "#ff0000";
        levelInstruction.style.textShadow = "0 0 5px #ff0000";
        levelInstruction.style.fontWeight = "bold";
        levelInstruction.style.animation = "pulse 0.5s infinite";
    } else {
        levelInstruction.style.color = "#ffff00";
        levelInstruction.style.textShadow = "0 0 5px #000000";
        levelInstruction.style.fontWeight = "normal";
        levelInstruction.style.animation = "none";
    }
}

// =============================================
// GAME LOGIC FUNCTIONS
// =============================================

function shoot() {
    if (ammo <= 0 || !gameRunning) return;
    
    playSound(shootSound);
    ammo--;
    updateAmmoUI(ammo);
    
    bullets.push({
        x: shark.direction === "left" ? shark.x : shark.x + shark.width,
        y: shark.y + shark.height / 2 - 2,
        width: 10,
        height: 4,
        speed: 10,
        direction: shark.direction
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (bullet.direction === "left") {
            bullet.x -= bullet.speed;
        } else {
            bullet.x += bullet.speed;
        }
        
        if (bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(i, 1);
            continue;
        }
        
        for (let j = fish.length - 1; j >= 0; j--) {
            const f = fish[j];
            if (checkCollision(bullet, f)) {
                playSound(eatSound);
                updateSharkStats(f.value);
                fish.splice(j, 1);
                bullets.splice(i, 1);
                checkLevelUp();
                break;
            }
        }
        
        if (boss.isActive && checkCollision(bullet, boss)) {
            boss.health -= 2;
            bullets.splice(i, 1);
            if (boss.health <= 0) {
                boss.isActive = false;
                shark.score += 50;
                scoreDisplay.textContent = `Score: ${shark.score}`;
                showInstruction("BOSS DEFEATED! YOU WIN!");
                if (ammoDropInterval) {
                    clearInterval(ammoDropInterval);
                    ammoDropInterval = null;
                }
            }
        }
    }
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function updateSharkStats(value) {
    shark.score += value;
    shark.value += value;
    shark.width += value * 3;
    shark.height += value * 2;
    shark.health = Math.min(shark.health + value, 15);
    healthInner.style.width = `${(shark.health / 15) * 100}%`;
    scoreDisplay.textContent = `Score: ${shark.score}`;
}

function spawnAmmoDrop() {
    if (currentLevel === "deep" && boss.isActive) {
        ammoDrops.push({
            image: ammoImage,
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2,
            value: 1
        });
    }
}

function updateAmmoDrops() {
    for (let i = ammoDrops.length - 1; i >= 0; i--) {
        const drop = ammoDrops[i];
        drop.y += drop.speed;
        
        if (checkCollision(shark, drop)) {
            ammo += drop.value;
            updateAmmoUI(ammo);
            ammoDrops.splice(i, 1);
            playSound(eatSound);
            continue;
        }
        
        if (drop.y > canvas.height) {
            ammoDrops.splice(i, 1);
        }
    }
}

function activateWeaponDrop() {
    if (currentLevel === "mid" && shark.score >= 50 && !weaponDrop.collected) {
        weaponDrop.x = Math.random() * (canvas.width - weaponDrop.width);
        weaponDrop.y = -weaponDrop.height;
        weaponDrop.isActive = true;
        weaponDrop.collected = false;
        showInstruction("WEAPON DROPPED! Collect it before proceeding");
        showRequirementMet("WEAPON UNLOCKED! Collect the laser gun");
    }
}

function updateWeaponDrop() {
    if (weaponDrop.collected || !weaponDrop.isActive) return;
    
    weaponDrop.y += weaponDrop.speed;
    
    if (checkCollision(shark, weaponDrop)) {
        shark.hasWeapon = true;
        weaponDrop.collected = true;
        weaponDrop.isActive = false;
        ammo = 5;
        updateAmmoUI(ammo);
        playSound(eatSound);
        showInstruction("WEAPON ACQUIRED! Press E to shoot");
        showRequirementMet("WEAPON EQUIPPED! Press E to fire");
        
        shark.image = shark.direction === "left" ? 
            sharkImages.withGunLeft : sharkImages.withGunRight;
    }
    
    if (weaponDrop.y > canvas.height) {
        weaponDrop.isActive = false;
    }
}

function updateBoostMeter() {
    if (shark.isBoosting) {
        boostMeter.fill = Math.max(0, boostMeter.fill - boostMeter.drainRate);
        if (boostMeter.fill <= 0) {
            shark.isBoosting = false;
        }
    } else {
        boostMeter.fill = Math.min(boostMeter.maxFill, boostMeter.fill + boostMeter.rechargeRate);
        if (boostMeter.fill >= boostMeter.maxFill) {
            boostMeter.isVisible = false;
        }
    }
    shark.speed = shark.isBoosting ? shark.boostSpeed : shark.baseSpeed;
}

function showBossWarning() {
    if (!boss.warningShown && currentLevel === "mid" && shark.score >= 40) {
        boss.warningShown = true;
        bossWarningActive = true;
        
        showInstruction("BOSS INCOMING!", true);
        playSound(warningSound);
        showRequirementMet("WARNING! BOSS INCOMING!");
        
        const flashInterval = setInterval(() => {
            bossWarningAlpha = bossWarningAlpha === 0 ? 0.3 : 0;
        }, 300);

        setTimeout(() => {
            clearInterval(flashInterval);
            bossWarningActive = false;
            showInstruction("Swim DOWN to enter Deep Ocean!");
        }, 3000);
    }
}

function activateBoss() {
    if (shark.score < 50) return;
    
    boss.isActive = true;
    boss.health = boss.maxHealth;
    showInstruction("DEFEAT THE BOSS!", true);
    showRequirementMet("BOSS BATTLE! SHOOT THE BOSS TO WIN!");
    
    if (!ammoDropInterval) {
        ammoDropInterval = setInterval(spawnAmmoDrop, 5000);
    }
}

function updateBoss() {
    if (!boss.isActive) return;

    boss.y += Math.sin(Date.now() / 1000) * 1.5;

    if (checkCollision(shark, boss)) {
        sharkHit();
    }

    if (boss.health <= 0) {
        boss.isActive = false;
        shark.score += 50;
        scoreDisplay.textContent = `Score: ${shark.score}`;
        showInstruction("BOSS DEFEATED! YOU WIN!");
        showRequirementMet("VICTORY! ALL REQUIREMENTS COMPLETE!");
    }
}

function moveShark() {
    updateBoostMeter();
    
    if (shark.falling) {
        shark.y += 5;
        if (shark.y >= canvas.height / 2) {
            shark.falling = false;
            shark.image = shark.hasWeapon ? sharkImages.withGunRight : sharkImages.right;
            shark.direction = "right";
        }
        return;
    }

    if (keys["ArrowUp"] && shark.y > 0) shark.y -= shark.speed;
    if (keys["ArrowDown"] && shark.y < canvas.height - shark.height) shark.y += shark.speed;
    if (keys["ArrowLeft"] && shark.x > 0) {
        shark.x -= shark.speed;
        shark.direction = "left";
        shark.image = invincible ? sharkImages.redLeft : 
                     shark.hasWeapon ? sharkImages.withGunLeft : sharkImages.left;
    }
    if (keys["ArrowRight"] && shark.x < canvas.width - shark.width) {
        shark.x += shark.speed;
        shark.direction = "right";
        shark.image = invincible ? sharkImages.redRight : 
                     shark.hasWeapon ? sharkImages.withGunRight : sharkImages.right;
    }

    if (shark.y >= canvas.height - shark.height - 10) {
        checkLevelTransition();
    }
}

function checkLevelUp() {
    if (currentLevel === "mid" && shark.score > 50) {
        shark.score = 50;
        scoreDisplay.textContent = `Score: ${shark.score}`;
    }

    if (shark.score >= 30 && currentLevel === "top" && !showingLevelNote) {
        playSound(levelUpMp3);
        showInstruction("LEVEL UP! Press DOWN ARROW to enter Mid Ocean");
        showingLevelNote = true;
        showRequirementMet("REQUIREMENT MET: Score ≥ 30");
    } else if (shark.score >= 40 && currentLevel === "mid" && !showingLevelNote) {
        playSound(levelUpMp3);
        showInstruction("LEVEL UP! Press DOWN ARROW to enter Deep Ocean");
        showingLevelNote = true;
        showBossWarning();
        showRequirementMet("REQUIREMENT MET: Score ≥ 40");
    } else if (shark.score >= 50 && currentLevel === "mid" && !weaponDrop.isActive && !shark.hasWeapon) {
        playSound(levelUpMp3);
        activateWeaponDrop();
        showRequirementMet("REQUIREMENT MET: Score ≥ 50 - Weapon Unlocked!");
    }
}

function checkLevelTransition() {
    if (shark.score >= 30 && currentLevel === "top") {
        showRequirementMet("ENTERING MID OCEAN - Requirements satisfied!");
        levelUp("mid", "ocean-mid.png");
        shark.y = canvas.height / 2 - shark.height / 2;
    } else if (shark.score >= 50 && currentLevel === "mid") {
        if (shark.hasWeapon) {
            showRequirementMet("ENTERING DEEP OCEAN - Weapon equipped!");
            levelUp("deep", "ocean-deep.png");
            shark.y = canvas.height / 2 - shark.height / 2;
            activateBoss();
        } else {
            showInstruction("YOU NEED THE WEAPON TO PROCEED!");
            showRequirementMet("MISSING REQUIREMENT: Equip weapon first!");
            shark.y = canvas.height / 2 - shark.height / 2;
            activateWeaponDrop();
        }
    }
}

function levelUp(newLevel, background) {
    playSound(levelUpSound);
    currentLevel = newLevel;
    canvas.style.background = `url('${background}') no-repeat center center`;
    canvas.style.backgroundSize = "cover";
    
    shark.value = 1;
    shark.width = 80;
    shark.height = 50;
    shark.health = 15;
    shark.speed = shark.baseSpeed;
    shark.isBoosting = false;
    boostMeter.fill = boostMeter.maxFill;
    boostMeter.isVisible = false;
    healthInner.style.width = "100%";
    
    shark.x = canvas.width / 2 - shark.width / 2;
    shark.y = canvas.height / 2 - shark.height / 2;
    levelNote.style.display = "none";
    showingLevelNote = false;
    
    fish = [];
    bullets.length = 0;
    ammoDrops.length = 0;
    
    if (newLevel === "mid") {
        shark.hasWeapon = false;
        updateAmmoUI(0);
        if (ammoDropInterval) {
            clearInterval(ammoDropInterval);
            ammoDropInterval = null;
        }
    }
}

function spawnFish() {
    const types = fishTypes[currentLevel];
    const type = types[Math.floor(Math.random() * types.length)];

    fish.push({
        x: Math.random() < 0.5 ? -type.size : canvas.width + type.size,
        y: Math.random() * (canvas.height - type.size),
        width: type.size,
        height: type.size,
        value: type.value,
        speed: Math.random() * 2 + 1,
        direction: Math.random() < 0.5 ? 1 : -1,
        image: fishImages[currentLevel]
    });
}

function moveFish() {
    fish.forEach(f => f.x += f.speed * f.direction);
}

function update() {
    if (!gameRunning) return;
    
    moveShark();
    moveFish();
    updateBullets();
    updateAmmoDrops();
    updateWeaponDrop();
    updateBoss();
    showBossWarning();
    updateInstructions();

    for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i];
        if (checkCollision(shark, f)) {
            if (!invincible && f.value > shark.value) {
                sharkHit();
            } else if (shark.width > f.width) {
                playSound(eatSound);
                updateSharkStats(f.value);
                lastAteTime = Date.now();
                fish.splice(i, 1);
                checkLevelUp();
            }
        }
    }

    if (!invincible && Date.now() - lastAteTime > 750) {
        shark.health -= 1;
        healthInner.style.width = `${(shark.health / 15) * 100}%`;
        lastAteTime = Date.now();
        if (shark.health <= 0) {
            gameRunning = false;
            alert(`Game Over! Final Score: ${shark.score}`);
        }
    }
}

function sharkHit() {
    if (invincible) return;

    invincible = true;
    shark.health -= 5;
    healthInner.style.width = `${(shark.health / 15) * 100}%`;
    
    if (shark.health <= 0) {
        gameRunning = false;
        alert(`Game Over! Final Score: ${shark.score}`);
        return;
    }

    let blinkCount = 0;
    const maxBlinks = 5;

    const blinkInterval = setInterval(() => {
        blinkCount++;
        shark.image = (blinkCount % 2 === 0) ? 
            (shark.hasWeapon ? 
                (shark.direction === "left" ? sharkImages.withGunLeft : sharkImages.withGunRight) : 
                (shark.direction === "left" ? sharkImages.left : sharkImages.right)) : 
            (shark.direction === "left" ? sharkImages.redLeft : sharkImages.redRight);

        if (blinkCount >= maxBlinks * 2) {
            clearInterval(blinkInterval);
            shark.image = shark.hasWeapon ? 
                (shark.direction === "left" ? sharkImages.withGunLeft : sharkImages.withGunRight) : 
                (shark.direction === "left" ? sharkImages.left : sharkImages.right);
            invincible = false;
        }
    }, 100);
}

// =============================================
// RENDERING FUNCTIONS
// =============================================

function drawBullets() {
    ctx.fillStyle = "red";
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawAmmoDrops() {
    ammoDrops.forEach(drop => {
        try {
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.drawImage(drop.image, drop.x, drop.y, drop.width, drop.height);
            ctx.shadowBlur = 0;
            
            const pulse = Math.sin(Date.now()/200) * 2;
            ctx.drawImage(drop.image, drop.x-pulse/2, drop.y-pulse/2, drop.width+pulse, drop.height+pulse);
        } catch (e) {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(drop.x, drop.y, drop.width, drop.height);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AMMO', drop.x + drop.width/2, drop.y + drop.height/2 + 5);
        }
    });
}

function drawWeaponDrop() {
    if (weaponDrop.isActive && !weaponDrop.collected) {
        try {
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 20;
            ctx.drawImage(weaponDrop.image, weaponDrop.x, weaponDrop.y, weaponDrop.width, weaponDrop.height);
            ctx.shadowBlur = 0;
            
            const pulse = Math.sin(Date.now()/300) * 3;
            ctx.drawImage(weaponDrop.image, weaponDrop.x-pulse/2, weaponDrop.y-pulse/2, weaponDrop.width+pulse, weaponDrop.height+pulse);
        } catch (e) {
            ctx.fillStyle = 'red';
            ctx.fillRect(weaponDrop.x, weaponDrop.y, weaponDrop.width, weaponDrop.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GUN', weaponDrop.x + weaponDrop.width/2, weaponDrop.y + weaponDrop.height/2 + 5);
        }
    }
}

function drawBoostMeter() {
    if (!boostMeter.isVisible) return;
    
    const fillWidth = (boostMeter.fill / boostMeter.maxFill) * (boostMeter.width - 6);
    let fillColor = boostMeter.fill > 60 ? boostMeter.colors.full : 
                   boostMeter.fill > 30 ? boostMeter.colors.medium : 
                   boostMeter.colors.low;

    ctx.strokeStyle = boostMeter.colors.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(boostMeter.x, boostMeter.y, boostMeter.width, boostMeter.height);
    ctx.fillStyle = fillColor;
    ctx.fillRect(boostMeter.x + 3, boostMeter.y + 3, fillWidth, boostMeter.height - 6);
    
    ctx.strokeStyle = boostMeter.colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boostMeter.x + boostMeter.width, boostMeter.y - 5);
    ctx.lineTo(boostMeter.x + boostMeter.width, boostMeter.y - 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(boostMeter.x + boostMeter.width/2, boostMeter.y - 5);
    ctx.lineTo(boostMeter.x + boostMeter.width/2, boostMeter.y - 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(boostMeter.x, boostMeter.y - 5);
    ctx.lineTo(boostMeter.x, boostMeter.y - 10);
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("BOOST", boostMeter.x, boostMeter.y - 15);
}

function drawBossWarning() {
    if (!bossWarningActive) return;
    ctx.fillStyle = `rgba(255, 0, 0, ${bossWarningAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBoss() {
    if (!boss.isActive) return;
    try {
        ctx.drawImage(boss.image, boss.x, boss.y, boss.width, boss.height);
    } catch (e) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('BOSS', boss.x + 70, boss.y + 75);
    }
    
    const healthWidth = (boss.health / boss.maxHealth) * boss.width;
    ctx.fillStyle = "red";
    ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
    ctx.fillStyle = "green";
    ctx.fillRect(boss.x, boss.y - 20, healthWidth, 10);
}

function draw() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBossWarning();
    
    try {
        ctx.drawImage(shark.image, shark.x, shark.y, shark.width, shark.height);
    } catch (e) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(shark.x, shark.y, shark.width, shark.height);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('SHARK', shark.x + 10, shark.y + 25);
    }
    
    if (shark.isBoosting) {
        ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
        const trailOffset = shark.direction === "left" ? shark.width : -20;
        ctx.fillRect(shark.x + trailOffset, shark.y, 20, shark.height);
    }
    
    drawBoostMeter();
    
    fish.forEach(f => {
        try {
            ctx.drawImage(f.image, f.x, f.y, f.width, f.height);
        } catch (e) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(f.x, f.y, f.width, f.height);
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText('FISH', f.x + 5, f.y + 15);
        }
    });
    
    drawWeaponDrop();
    drawAmmoDrops();
    drawBullets();
    drawBoss();
}

// =============================================
// GAME LOOP AND INITIALIZATION
// =============================================

function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameRunning = true;
    startButton.style.display = "none";
    gameTitle.style.display = "none";
    canvas.style.display = "block";
    scoreDisplay.style.display = "block";
    healthBar.style.display = "block";
    creditsButton.style.display = "none";
    levelInstruction.style.display = "block";
    
    shark = {
        x: canvas.width / 2 - 40,
        y: -80,
        width: 80,
        height: 50,
        speed: 4,
        baseSpeed: 4,
        boostSpeed: 5.5,
        score: 0,
        value: 1,
        health: 15,
        image: sharkImages.down,
        direction: "down",
        falling : true,
        isBoosting : false,
        hasWeapon : false
    };
    
    fish = [];
    bullets.length = 0;
    ammoDrops.length = 0;
    currentLevel = "top";
    showingLevelNote = false;
    bossWarningActive = false;
    bossWarningAlpha = 0;
    boss.isActive = false;
    boss.warningShown = false;
    weaponDrop.isActive = false;
    weaponDrop.collected = false;
    hasWeapon = false;
    ammo = 0;
    updateAmmoUI(0);
    boostMeter.fill = boostMeter.maxFill;
    boostMeter.isVisible = false;
    canvas.style.background = "url('ocean-top.png') no-repeat center center";
    canvas.style.backgroundSize = "cover";
    scoreDisplay.textContent = "Score: 0";
    healthInner.style.width = "100%";
    levelNote.style.display = "none";
    
    if (ammoDropInterval) clearInterval(ammoDropInterval);
    if (fishSpawnInterval) clearInterval(fishSpawnInterval);
    ammoDropInterval = null;
    fishSpawnInterval = setInterval(spawnFish, 800);
    
    gameLoop();
}

// =============================================
// EVENT LISTENERS
// =============================================

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " " && !shark.falling && gameRunning && boostMeter.fill > 0) {
        shark.isBoosting = true;
        boostMeter.isVisible = true;
    }
    if (e.key === "e" && gameRunning && shark.hasWeapon && ammo > 0) {
        shoot();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    if (e.key === " " && !shark.falling && gameRunning) {
        shark.isBoosting = false;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("startButton").addEventListener("click", startGame);
    document.getElementById("creditsButton").addEventListener("click", function() {
        document.getElementById("creditsPopup").style.display = "block";
    });
    document.getElementById("closeCredits").addEventListener("click", function() {
        document.getElementById("creditsPopup").style.display = "none";
    });
});

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}
// When player loses:
localStorage.setItem('sharkScore', currentScore); // Save score
window.location.href = "gameover.html";

// When player wins:
localStorage.setItem('sharkScore', currentScore);
window.location.href = "win.html";
// =============================================
// MODIFIED GAME OVER/WIN FUNCTIONS
// =============================================

function gameOver() {
    gameRunning = false;
    localStorage.setItem('sharkScore', shark.score);
    window.location.href = "gameover.html";
}

function gameWin() {
    gameRunning = false;
    localStorage.setItem('sharkScore', shark.score);
    window.location.href = "win.html";
}

// =============================================
// UPDATED SHARK HIT FUNCTION
// =============================================

function sharkHit() {
    if (invincible) return;

    invincible = true;
    shark.health -= 5;
    healthInner.style.width = `${(shark.health / 15) * 100}%`;
    
    if (shark.health <= 0) {
        gameOver(); // Changed from alert to page transition
        return;
    }

    let blinkCount = 0;
    const maxBlinks = 5;

    const blinkInterval = setInterval(() => {
        blinkCount++;
        shark.image = (blinkCount % 2 === 0) ? 
            (shark.hasWeapon ? 
                (shark.direction === "left" ? sharkImages.withGunLeft : sharkImages.withGunRight) : 
                (shark.direction === "left" ? sharkImages.left : sharkImages.right)) : 
            (shark.direction === "left" ? sharkImages.redLeft : sharkImages.redRight);

        if (blinkCount >= maxBlinks * 2) {
            clearInterval(blinkInterval);
            shark.image = shark.hasWeapon ? 
                (shark.direction === "left" ? sharkImages.withGunLeft : sharkImages.withGunRight) : 
                (shark.direction === "left" ? sharkImages.left : sharkImages.right);
            invincible = false;
        }
    }, 100);
}

// =============================================
// UPDATED BOSS DEFEAT LOGIC
// =============================================

function updateBoss() {
    if (!boss.isActive) return;

    boss.y += Math.sin(Date.now() / 1000) * 1.5;

    if (checkCollision(shark, boss)) {
        sharkHit();
    }

    if (boss.health <= 0) {
        gameWin(); // Changed from alert to page transition
    }
}

// =============================================
// UPDATED MAIN UPDATE FUNCTION
// =============================================

function update() {
    if (!gameRunning) return;
    
    moveShark();
    moveFish();
    updateBullets();
    updateAmmoDrops();
    updateWeaponDrop();
    updateBoss();
    showBossWarning();
    updateInstructions();

    for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i];
        if (checkCollision(shark, f)) {
            if (!invincible && f.value > shark.value) {
                sharkHit();
            } else if (shark.width > f.width) {
                playSound(eatSound);
                updateSharkStats(f.value);
                lastAteTime = Date.now();
                fish.splice(i, 1);
                checkLevelUp();
            }
        }
    }

    if (!invincible && Date.now() - lastAteTime > 750) {
        shark.health -= 1;
        healthInner.style.width = `${(shark.health / 15) * 100}%`;
        lastAteTime = Date.now();
        if (shark.health <= 0) {
            gameOver(); // Changed from alert to page transition
        }
    }
}
