'use strict';

const STORAGE_KEY = 'jp-tangocho-v1';

let data = { vocabulary: [], grammar: [] };
let mode = 'vocabulary';    // 'vocabulary' | 'grammar'
let filter = 'all';         // 'all' | 'known' | 'unknown'
let currentIndex = 0;
let isFlipped = false;
let state = {};             // { [imgKey]: { status: 'known'|'unknown'|null, meaning: '' } }

// ── Elements ──
const cardInner   = document.getElementById('card-inner');
const cardImg     = document.getElementById('card-img');
const pageBadge   = document.getElementById('page-badge');
const counter     = document.getElementById('counter');
const progressBar = document.getElementById('progress-bar');
const progressText= document.getElementById('progress-text');
const vocabCount  = document.getElementById('vocab-count');
const grammarCount= document.getElementById('grammar-count');
const meaningInput= document.getElementById('meaning-input');
const saveBtn     = document.getElementById('save-btn');
const cardFront   = document.querySelector('.card-front');
const cardContainer = document.getElementById('card-container');

// ── Load ──
async function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = JSON.parse(saved);

  try {
    const res = await fetch('data.json');
    data = await res.json();
  } catch (e) {
    console.error('data.json 로드 실패', e);
    return;
  }

  setupTabs();
  setupNavButtons();
  setupFilterButtons();
  setupSaveBtn();
  setupCardFlip();
  setupSwipe();
  renderMode();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Current list ──
function getItems() {
  const items = mode === 'vocabulary' ? data.vocabulary : data.grammar;
  if (filter === 'all') return items;
  return items.filter(item => {
    const s = state[item.image];
    const status = s ? s.status : null;
    return filter === 'known' ? status === 'known' : status !== 'known';
  });
}

function getCurrentItem() {
  const items = getItems();
  return items[currentIndex] || null;
}

// ── Render ──
function renderMode() {
  currentIndex = 0;
  isFlipped = false;
  cardInner.classList.remove('flipped');

  const vTotal = data.vocabulary.length;
  const gTotal = data.grammar.length;
  vocabCount.textContent = `(${vTotal})`;
  grammarCount.textContent = `(${gTotal})`;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  progressBar.className = 'progress-bar' + (mode === 'grammar' ? ' grammar' : '');
  renderCard();
}

function renderCard() {
  const items = getItems();
  const item = getCurrentItem();

  if (!item) {
    cardImg.src = '';
    pageBadge.textContent = '';
    counter.textContent = '0 / 0';
    progressBar.style.width = '0%';
    progressText.textContent = '카드가 없습니다';
    return;
  }

  const s = state[item.image] || {};
  cardImg.src = 'images/' + item.image;
  pageBadge.textContent = 'p.' + item.page;
  meaningInput.value = s.meaning || '';

  cardFront.className = 'card-front';
  if (s.status === 'known') cardFront.classList.add('known-card');
  else if (s.status === 'unknown') cardFront.classList.add('unknown-card');

  counter.textContent = `${currentIndex + 1} / ${items.length}`;

  // Progress (known 비율)
  const all = mode === 'vocabulary' ? data.vocabulary : data.grammar;
  const knownCount = all.filter(i => state[i.image] && state[i.image].status === 'known').length;
  const pct = all.length ? (knownCount / all.length) * 100 : 0;
  progressBar.style.width = pct.toFixed(1) + '%';
  progressText.textContent = `알아: ${knownCount} / ${all.length}`;
}

// ── Card flip ──
function setupCardFlip() {
  cardContainer.addEventListener('click', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    toggleFlip();
  });
}

function toggleFlip() {
  isFlipped = !isFlipped;
  cardInner.classList.toggle('flipped', isFlipped);
}

// ── Tabs ──
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      filter = 'all';
      document.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'all')
      );
      renderMode();
    });
  });
}

// ── Nav buttons ──
function setupNavButtons() {
  document.getElementById('prev-btn').addEventListener('click', () => {
    navigate(-1);
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    navigate(1);
  });
  document.getElementById('known-btn').addEventListener('click', () => {
    setStatus('known');
    navigate(1);
  });
  document.getElementById('unknown-btn').addEventListener('click', () => {
    setStatus('unknown');
    navigate(1);
  });
}

function navigate(dir) {
  const items = getItems();
  if (!items.length) return;
  currentIndex = (currentIndex + dir + items.length) % items.length;
  isFlipped = false;
  cardInner.classList.remove('flipped');
  renderCard();
}

function setStatus(status) {
  const item = getCurrentItem();
  if (!item) return;
  if (!state[item.image]) state[item.image] = { status: null, meaning: '' };
  state[item.image].status = status;
  saveState();
}

// ── Save meaning ──
function setupSaveBtn() {
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    const item = getCurrentItem();
    if (!item) return;
    if (!state[item.image]) state[item.image] = { status: null, meaning: '' };
    state[item.image].meaning = meaningInput.value;
    saveState();
    saveBtn.textContent = '✓ 저장됨';
    setTimeout(() => { saveBtn.textContent = '저장'; }, 1200);
  });
}

// ── Filter ──
function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      currentIndex = 0;
      isFlipped = false;
      cardInner.classList.remove('flipped');
      renderCard();
    });
  });
}

// ── Swipe ──
function setupSwipe() {
  let startX = null;
  const card = document.getElementById('card');

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 50) return;  // 너무 짧으면 무시
    if (dx < 0) navigate(1);
    else navigate(-1);
  }, { passive: true });
}

init();
