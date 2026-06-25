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

let currentPage = game;

function setDisplay(el, display) {
    el.style.display = display ? "" : "none";
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
    button: {
        press: new Howl({ src: ['sounds/button_press.mp3'], volume: 0.25 }),
        release: new Howl({ src: ['sounds/button_release.mp3'], volume: 0.25 }),
        hover: new Howl({ src: ['sounds/button_hover.mp3'], volume: 0.25 }),
    },
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
  { url: 'https://emojicdn.elk.sh/🍒', rarity: 'Common', weight: 10 },
  { url: 'https://emojicdn.elk.sh/🍋', rarity: 'Common', weight: 10 },
  { url: 'https://emojicdn.elk.sh/🍊', rarity: 'Common', weight: 8 },
  { url: 'https://emojicdn.elk.sh/🍇', rarity: 'Rare',   weight: 5 },
  { url: 'https://emojicdn.elk.sh/🍉', rarity: 'Rare',   weight: 4 },
  { url: 'https://emojicdn.elk.sh/🍓', rarity: 'Epic',   weight: 2 },
  { url: 'https://emojicdn.elk.sh/🍑', rarity: 'Legendary', weight: 1 },
];

function onTriple(item) {
  document.getElementById('resultDisplay').textContent =
    `✨ Triple ${item.url} (${item.rarity})!`;
}

function onAllTriples() {
  document.getElementById('resultDisplay').innerHTML =
    '🏆 <span style="color:#f1c40f;font-weight:bold;">ALL TRIPLES COLLECTED!</span>';
  document.getElementById('spinBtn').disabled = true;
}

const SLOT_COUNT = 3;
const ITEM_HEIGHT = 90;
const SPIN_SPEED = 14;
const DECEL_DURATION = 600;
const STOP_DELAYS = [300, 800, 1300];

let items = iconData.map((d, i) => ({ ...d, id: i, locked: false }));
let activeItems = () => items.filter(item => !item.locked);

let slotElements = [];
let spinning = false;
let rafId = null;
let reels = [];
let lastFrameTime = 0;

const container = document.getElementById('slotContainer');
const spinBtn = document.getElementById('spinBtn');
const resultDisplay = document.getElementById('resultDisplay');
const statusContainer = document.getElementById('statusContainer');

function buildStripHTML(active) {
  const repeated = [];
  for (let c = 0; c < 6; c++) repeated.push(...active);
  return repeated.map(item =>
    `<div class="slot-item"><img src="${item.url}" alt="" /></div>`
  ).join('');
}

function renderStatus() {
  statusContainer.innerHTML = items.map(item => {
    const cls = item.locked ? 'status-item locked' : 'status-item';
    return `<div class="${cls}"><img src="${item.url}" alt="" /><span>${item.rarity}</span>${item.locked ? ' 🔒' : ''}</div>`;
  }).join('');
}

function renderSlots() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  container.innerHTML = '';
  slotElements = [];
  reels = [];

  const active = activeItems();
  if (active.length === 0) { onAllTriples(); return; }

  for (let i = 0; i < SLOT_COUNT; i++) {
    const windowDiv = document.createElement('div');
    windowDiv.className = 'slot-window';

    const listDiv = document.createElement('div');
    listDiv.className = 'slot-list';
    listDiv.innerHTML = buildStripHTML(active);

    windowDiv.appendChild(listDiv);
    container.appendChild(windowDiv);

    const randIdx = Math.floor(Math.random() * active.length);
    const offset = -(randIdx + active.length * 2) * ITEM_HEIGHT;
    listDiv.style.transform = `translateY(${offset}px)`;

    slotElements.push(listDiv);
    reels.push({ offset, state: 'idle' });
  }

  renderStatus();
}

function pickRandomIndex(active) {
  const totalWeight = active.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < active.length; i++) {
    rand -= active[i].weight;
    if (rand <= 0) return i;
  }
  return active.length - 1;
}

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;

  const active = activeItems();
  const cycleHeight = active.length * ITEM_HEIGHT;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const reel = reels[i];

    if (reel.state === 'spinning') {
      reel.offset -= SPIN_SPEED;
      if (reel.offset < -cycleHeight * 4) reel.offset += cycleHeight;

      if (timestamp >= reel.stopTime) {
        reel.state = 'decelerating';
        reel.decelStart = timestamp;
        reel.decelFrom = reel.offset;
        const base = -(reel.targetIndex + active.length * 2) * ITEM_HEIGHT;
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

    if (allSame) {
      const hitItem = active[targets[0]];
      const originalItem = items.find(it => it.id === hitItem.id);
      if (originalItem && !originalItem.locked) {
        originalItem.locked = true;
        onTriple(originalItem);
        renderStatus();
        spinBtn.disabled = false;
        return;
      }
    }

    const emojis = targets.map(idx => active[idx].url.split('/').pop());
    resultDisplay.textContent = `❌ ${emojis.join(' ')}`;
    spinBtn.disabled = false;
    return;
  }

  lastFrameTime = timestamp;
  rafId = requestAnimationFrame(gameLoop);
}

function spin() {
  if (spinning) return;

  const active = activeItems();
  if (active.length === 0) { onAllTriples(); return; }

  spinning = true;
  spinBtn.disabled = true;
  resultDisplay.textContent = '🎰 Spinning...';

  const now = performance.now();

  for (let i = 0; i < SLOT_COUNT; i++) {
    const targetIdx = pickRandomIndex(active);
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

window.resetGame = function() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  spinning = false;
  items.forEach(item => item.locked = false);
  renderSlots();
  spinBtn.disabled = false;
  resultDisplay.textContent = 'Game reset';
};