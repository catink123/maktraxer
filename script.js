/**
 * Initialization and helper functions
 */

function onFullyLoaded(callback) {
    if (document.readyState === 'complete') {
        // Already fully loaded
        callback();
    } else {
        window.addEventListener('load', callback);
    }
}

onFullyLoaded(() => {
    document.querySelector('.loading button').style.display = '';
});

let currentPage = q1;

function setDisplay(el, display) {
    el.style.display = display ? "" : "none";
}

let dodgeCount = 0;
function dodgeYes(btn) {
    if (dodgeCount < 5) {
        dodgeCount++;
        const br = btn.getBoundingClientRect();
        const pr = btn.parentElement.getBoundingClientRect();
        const minX = -pr.left;
        const minY = -pr.top;
        const maxX = window.innerWidth - pr.left - br.width;
        const maxY = window.innerHeight - pr.top - br.height;

        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        btn.style.position = 'absolute';
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
        btn.style.zIndex = '10';
    } else {
        dodgeCount = 0;
        btn.style.position = '';
        btn.style.left = '';
        btn.style.top = '';
        btn.style.zIndex = '';
        goto(q3no);
    }
}

let anim1, anim2;
function animateTransition(page1, page2) {
    if (anim1) anim1.cancel();
    if (anim2) anim2.cancel();

    setDisplay(page2, true);

    anim1 = page1.animate([
        { transform: "rotateX(0deg)", opacity: 1 },
        { transform: "rotateX(90deg)", opacity: 0 },
    ], { duration: 500, fill: 'forwards', easing: 'ease' });

    anim2 = page2.animate([
        { transform: "rotateX(-90deg)", opacity: 0 },
        { transform: "rotateX(0deg)", opacity: 1 },
    ], { duration: 500, fill: 'forwards', easing: 'ease' });

    Promise.all([anim1.finished, anim2.finished]).then(() => {
        setDisplay(page1, false);
    });
}

function goto(el) {
    animateTransition(currentPage, el);
    currentPage = el;
}

function gotoFoundGame() {
    if (anim1) anim1.cancel();
    if (anim2) anim2.cancel();

    setDisplay(foundGame, true);

    anim1 = currentPage.animate([
        { transform: "rotateX(0deg)", opacity: 1 },
        { transform: "rotateX(90deg)", opacity: 0 },
    ], { duration: 500, fill: 'forwards', easing: 'ease' });

    anim2 = foundGame.animate([
        { transform: "scale(1.5)", opacity: 0 },
        { transform: "scale(1.0)", opacity: 1 },
    ], { duration: 250, fill: 'forwards', easing: 'ease-in' });

    sounds.foundGame.play();
    sounds.bgMusic.fade(1, 0, 3000);

    Promise.all([anim1.finished, anim2.finished]).then(() => {
        setDisplay(currentPage, false);
        currentPage = foundGame;
    });
}

function gotoGame() {
    if (anim1) anim1.cancel();
    if (anim2) anim2.cancel();

    setDisplay(game, true);
    game.querySelectorAll('.titleSticker').forEach(v => v.play());

    anim1 = game.animate([
        { transform: "translateY(100%)", opacity: 0 },
        { transform: "translateY(0%)", opacity: 1 },
    ], { duration: 500, fill: 'forwards', easing: 'ease' });

    anim2 = foundGame.animate([
        { transform: "scale(1.0)", opacity: 1 },
        { transform: "scale(1.5)", opacity: 0 },
    ], { duration: 250, fill: 'forwards', easing: 'ease-out' });

    sounds.acceptedGame.play();

    sounds.ludoMusic.play();

    Promise.all([anim1.finished, anim2.finished]).then(() => {
        setDisplay(currentPage, false);
        currentPage = game;
    });
}

function start() {
    document.querySelector('.loading').classList.add('loaded');
    sounds.bgMusic.play();
}

setDisplay(currentPage, true);


/**
 * Sound system
 */


const sounds = {
    bgMusic: new Howl({ src: ['sounds/bg_music.mp3'], loop: true }),
    ludoMusic: new Howl({ src: ['sounds/ludik.mp3'], loop: true, volume: 0.45 }),
    
    button: {
        press: new Howl({ src: ['sounds/button_press.mp3'], volume: 0.25 }),
        release: new Howl({ src: ['sounds/button_release.mp3'], volume: 0.25 }),
        hover: new Howl({ src: ['sounds/button_hover.mp3'], volume: 0.25 }),
    },
    foundGame: new Howl({ src: ['sounds/game_found.mp3'], volume: 0.25 }),
    acceptedGame: new Howl({ src: ['sounds/goto_game.mp3'], volume: 0.25 }),
    slotsWin: new Howl({ src: ['sounds/slots_win.mp3'], volume: 0.25 }),
    slotsWinAll: new Howl({ src: ['sounds/slots_win_all.mp3'], volume: 0.25 }),
    slotsLose: new Howl({ src: ['sounds/slots_lose.mp3'], volume: 0.25 }),
    endSound: new Howl({ src: ['sounds/skil.mp3'], volume: 0.25 }),
};

function makeSoundCallback(sound) {
    return function () {
        sound.play();
    };
}

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mousedown', makeSoundCallback(sounds.button.press));
    btn.addEventListener('mouseup', makeSoundCallback(sounds.button.release));
    btn.addEventListener('touchstart', makeSoundCallback(sounds.button.press));
    btn.addEventListener('touchend', makeSoundCallback(sounds.button.release));
    btn.addEventListener('mouseenter', makeSoundCallback(sounds.button.hover));
});


/**
 * Game system
 */

const iconData = [
    { url: 'images/slot_icons/2.png', rarity: 'Common', weight: 10 },
    { url: 'images/slot_icons/4.png', rarity: 'Rare', weight: 5 },
    { url: 'images/slot_icons/5.png', rarity: 'Rare', weight: 4 },
    { url: 'images/slot_icons/7.png', rarity: 'Legendary', weight: 1 },
];

function onTriple(item) {
    sounds.slotsWin.play();
    const el = document.getElementById('tripleWin' + item.id);
    setDisplay(el, true);
    const videoEl = el.querySelector("video");
    if (videoEl) {
        videoEl.play();
    }
}

function dismissTripleWin() {
    for (let i = 0; i < totalItems; i++) {
        const el = document.getElementById('tripleWin' + i);
        setDisplay(el, false);
        const videoEl = el.querySelector("video");
        if (videoEl) {
            videoEl.pause();
        }
    }
    if (items.every(it => it.locked)) {
        onAllTriples();
    } else {
        spinBtn.disabled = false;
    }
}

function onAllTriples() {
    sounds.slotsWinAll.play();
    sounds.ludoMusic.fade(1, 0, 500);
    setTimeout(() => {
        goto(allWonScreen);
        sounds.endSound.play();
    }, 500);
}

const SLOT_COUNT = 3;
const ITEM_HEIGHT = 90;
const SPIN_SPEED = 14;
const DECEL_DURATION = 600;
const STOP_DELAYS = [300, 800, 1300];

let items = iconData.map((d, i) => ({ ...d, id: i, locked: false }));
let totalItems = items.length;

let slotElements = [];
let spinning = false;
let rafId = null;
let reels = [];
let lastFrameTime = 0;

const container = document.getElementById('slotContainer');
const spinBtn = document.getElementById('spinBtn');
const statusContainer = document.getElementById('statusContainer');

function buildStripHTML() {
    const repeated = [];
    for (let c = 0; c < 6; c++) repeated.push(...items);
    return repeated.map(item =>
        `<div class="slot-item"><img src="${item.url}" alt="" /></div>`
    ).join('');
}

function renderStatus() {
    const locked = items.filter(item => item.locked).length;
    statusContainer.innerHTML = `<div class="status-item">${locked} / ${totalItems} получено</div>`;
}

function renderSlots() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    container.innerHTML = '';
    slotElements = [];
    reels = [];

    const cycleHeight = totalItems * ITEM_HEIGHT;

    for (let i = 0; i < SLOT_COUNT; i++) {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'slot-window';

        const listDiv = document.createElement('div');
        listDiv.className = 'slot-list';
        listDiv.innerHTML = buildStripHTML();

        windowDiv.appendChild(listDiv);
        container.appendChild(windowDiv);

        const randIdx = Math.floor(Math.random() * totalItems);
        const offset = -(randIdx + totalItems * 2) * ITEM_HEIGHT;
        listDiv.style.transform = `translateY(${offset}px)`;

        slotElements.push(listDiv);
        reels.push({ offset, state: 'idle' });
    }

    renderStatus();
}

function pickRandomIndex() {
    const totalWeight = items.reduce((sum, item) => sum + (item.locked ? 0 : item.weight), 0);
    if (totalWeight === 0) return -1;
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        if (items[i].locked) continue;
        rand -= items[i].weight;
        if (rand <= 0) return i;
    }
    return items.length - 1;
}

function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    const cycleHeight = totalItems * ITEM_HEIGHT;

    for (let i = 0; i < SLOT_COUNT; i++) {
        const reel = reels[i];

        if (reel.state === 'spinning') {
            reel.offset -= SPIN_SPEED;
            if (reel.offset < -cycleHeight * 4) reel.offset += cycleHeight;

            if (timestamp >= reel.stopTime) {
                reel.state = 'decelerating';
                reel.decelStart = timestamp;
                reel.decelFrom = reel.offset;
                const base = -(reel.targetIndex + totalItems * 2) * ITEM_HEIGHT;
                let target = base;
                while (target > reel.decelFrom) target -= cycleHeight;
                reel.decelTo = target;
            }
        } else if (reel.state === 'decelerating') {
            const t = Math.min(1, (timestamp - reel.decelStart) / DECEL_DURATION);
            const eased = 1 - Math.pow(1 - t, 3);
            reel.offset = reel.decelFrom + (reel.decelTo - reel.decelFrom) * eased;
            if (t >= 1) {
                reel.offset = reel.decelTo;
                reel.state = 'idle';
            }
        }

        slotElements[i].style.transform = `translateY(${reel.offset}px)`;
    }

    if (reels.every(r => r.state === 'idle')) {
        rafId = null;
        lastFrameTime = 0;
        spinning = false;

        const targets = reels.map(r => r.targetIndex);
        const allSame = targets.every(t => t === targets[0]);

        if (allSame && !items[targets[0]].locked) {
            items[targets[0]].locked = true;
            onTriple(items[targets[0]]);
            renderStatus();
            return;
        }

        const emojis = targets.map(idx => items[idx].url.split('/').pop());
        spinBtn.disabled = false;
        return;
    }

    lastFrameTime = timestamp;
    rafId = requestAnimationFrame(gameLoop);
}

function spin() {
    if (spinning) return;

    const hasAvailable = items.some(it => !it.locked);
    if (!hasAvailable) { onAllTriples(); return; }

    spinning = true;
    spinBtn.disabled = true;

    const now = performance.now();

    for (let i = 0; i < SLOT_COUNT; i++) {
        const targetIdx = pickRandomIndex();
        reels[i].state = 'spinning';
        reels[i].stopTime = now + STOP_DELAYS[i];
        reels[i].targetIndex = targetIdx;
    }

    lastFrameTime = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
}

renderSlots();
spinBtn.addEventListener('click', spin);

window.forceWin = function (index) {
    if (spinning) return;
    if (index < 0 || index >= items.length) return;
    if (items[index].locked) return;

    spinning = true;
    spinBtn.disabled = true;

    const now = performance.now();

    for (let i = 0; i < SLOT_COUNT; i++) {
        reels[i].state = 'spinning';
        reels[i].stopTime = now + STOP_DELAYS[i];
        reels[i].targetIndex = index;
    }

    lastFrameTime = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
};

window.resetGame = function () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    spinning = false;
    items.forEach(item => item.locked = false);
    renderSlots();
    spinBtn.disabled = false;
};

document.querySelector('#tripleWin3 video').volume = 0.25;