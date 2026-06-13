'use strict';

const STORAGE_KEY = 'jp-tangocho-v1';

let items = [];
let filter = 'all';
let currentIndex = 0;
let isFlipped = false;
let state = {};

const cardInner    = document.getElementById('card-inner');
const cardImg      = document.getElementById('card-img');
const pageBadge    = document.getElementById('page-badge');
const counter      = document.getElementById('counter');
const progressBar  = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const totalCount   = document.getElementById('total-count');
const meaningInput = document.getElementById('meaning-input');
const saveBtn      = document.getElementById('save-btn');
const cardFront    = document.querySelector('.card-front');
const cardContainer= document.getElementById('card-container');

async function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = JSON.parse(saved);

  try {
    const res = await fetch('data.json');
    const data = await res.json();
    items = [...data.vocabulary, ...data.grammar];
  } catch (e) {
    console.error('data.json 로드 실패', e);
    return;
  }

  setupNavButtons();
  setupFilterButtons();
  setupSaveBtn();
  setupCardFlip();
  setupSwipe();
  render();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getFiltered() {
  if (filter === 'all') return items;
  return items.filter(item => {
    const status = (state[item.image] || {}).status;
    return filter === 'known' ? status === 'known' : status !== 'known';
  });
}

function getCurrentItem() {
  return getFiltered()[currentIndex] || null;
}

function render() {
  const filtered = getFiltered();
  const item = getCurrentItem();

  totalCount.textContent = `전체 ${items.length}장`;

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

  counter.textContent = `${currentIndex + 1} / ${filtered.length}`;

  const knownCount = items.filter(i => (state[i.image] || {}).status === 'known').length;
  progressBar.style.width = (knownCount / items.length * 100).toFixed(1) + '%';
  progressText.textContent = `알아: ${knownCount} / ${items.length}`;
}

function setupCardFlip() {
  cardContainer.addEventListener('click', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    isFlipped = !isFlipped;
    cardInner.classList.toggle('flipped', isFlipped);
  });
}

function navigate(dir) {
  const filtered = getFiltered();
  if (!filtered.length) return;
  currentIndex = (currentIndex + dir + filtered.length) % filtered.length;
  isFlipped = false;
  cardInner.classList.remove('flipped');
  render();
}

function setStatus(status) {
  const item = getCurrentItem();
  if (!item) return;
  if (!state[item.image]) state[item.image] = { status: null, meaning: '' };
  state[item.image].status = status;
  saveState();
}

function setupNavButtons() {
  document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
  document.getElementById('next-btn').addEventListener('click', () => navigate(1));
  document.getElementById('known-btn').addEventListener('click', () => { setStatus('known'); navigate(1); });
  document.getElementById('unknown-btn').addEventListener('click', () => { setStatus('unknown'); navigate(1); });
}

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

function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      currentIndex = 0;
      isFlipped = false;
      cardInner.classList.remove('flipped');
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
