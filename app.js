'use strict';

const STORAGE_KEY = 'jp-tangocho-v1';

let allItems = [];
let mode = 'read';
let filter = 'all';
let currentIndex = 0;
let state = {};

const cardImg      = document.getElementById('card-img');
const pageBadge    = document.getElementById('page-badge');
const counter      = document.getElementById('counter');
const progressBar  = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const readCount    = document.getElementById('read-count');
const listenCount  = document.getElementById('listen-count');
const cardFront    = document.querySelector('.card-front');

async function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = JSON.parse(saved);

  try {
    const res = await fetch('data.json');
    const data = await res.json();
    const sort = arr => [...arr].sort((a, b) => a.page - b.page);
    allItems = {
      read:   sort([...data.vocabulary, ...data.grammar].filter(i => i.source === 'read')),
      listen: sort([...data.vocabulary, ...data.grammar].filter(i => i.source === 'listen')),
    };
  } catch (e) {
    console.error('data.json 로드 실패', e);
    return;
  }

  setupTabs();
  setupNavButtons();
  setupFilterButtons();
  setupSwipe();
  renderMode();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getModeItems() {
  return allItems[mode] || [];
}

function getFiltered() {
  const items = getModeItems();
  if (filter === 'all') return items;
  return items.filter(item => {
    const status = (state[item.image] || {}).status;
    return filter === 'known' ? status === 'known' : status !== 'known';
  });
}

function getCurrentItem() {
  return getFiltered()[currentIndex] || null;
}

function renderMode() {
  currentIndex = 0;

  readCount.textContent   = `(${allItems.read.length})`;
  listenCount.textContent = `(${allItems.listen.length})`;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  progressBar.className = 'progress-bar' + (mode === 'listen' ? ' grammar' : '');
  render();
}

function render() {
  const filtered = getFiltered();
  const items = getModeItems();
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

  cardFront.className = 'card-front';
  if (s.status === 'known') cardFront.classList.add('known-card');
  else if (s.status === 'unknown') cardFront.classList.add('unknown-card');

  counter.textContent = `${currentIndex + 1} / ${filtered.length}`;

  const knownCount = items.filter(i => (state[i.image] || {}).status === 'known').length;
  progressBar.style.width = (knownCount / items.length * 100).toFixed(1) + '%';
  progressText.textContent = `알아: ${knownCount} / ${items.length}`;
}

function navigate(dir) {
  const filtered = getFiltered();
  if (!filtered.length) return;
  currentIndex = (currentIndex + dir + filtered.length) % filtered.length;
  render();
}

function setStatus(status) {
  const item = getCurrentItem();
  if (!item) return;
  if (!state[item.image]) state[item.image] = { status: null };
  state[item.image].status = status;
  saveState();
}

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

function setupNavButtons() {
  document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
  document.getElementById('next-btn').addEventListener('click', () => navigate(1));
  document.getElementById('known-btn').addEventListener('click', () => { setStatus('known'); navigate(1); });
  document.getElementById('unknown-btn').addEventListener('click', () => { setStatus('unknown'); navigate(1); });
}

function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      currentIndex = 0;
      render();
    });
  });
}

function setupSwipe() {
  let startX = null;
  const card = document.getElementById('card');
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 50) return;
    navigate(dx < 0 ? 1 : -1);
  }, { passive: true });
}

init();
