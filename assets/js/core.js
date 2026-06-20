/**
 * VOIDBORN — CORE UTILITIES
 * Shared helpers used across all pages
 */

// ── DATA FETCHING ─────────────────────────────────────────
/**
 * Fetch JSON data file with basic caching
 */
const dataCache = {};

async function fetchData(path) {
  if (dataCache[path]) return dataCache[path];
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    dataCache[path] = data;
    return data;
  } catch (err) {
    console.error(`[VOIDBORN] Failed to load ${path}:`, err);
    return null;
  }
}

// Expose data loader
window.VB = window.VB || {};
window.VB.fetchData = fetchData;

// ── LOCAL STORAGE HELPERS ────────────────────────────────
const STORAGE_PREFIX = 'voidborn_';

const storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(STORAGE_PREFIX + key); return true; }
    catch { return false; }
  }
};

window.VB.storage = storage;

// ── READING PROGRESS ──────────────────────────────────────
const progress = {
  // { chapterId: { page: number, total: number, timestamp: number } }
  getAll() { return storage.get('reading_progress', {}); },

  save(chapterId, page, total) {
    const all = this.getAll();
    all[chapterId] = { page, total, timestamp: Date.now() };
    storage.set('reading_progress', all);
    this.updateStreak();
  },

  get(chapterId) {
    const all = this.getAll();
    return all[chapterId] || null;
  },

  getLastRead() {
    const all = this.getAll();
    const entries = Object.entries(all);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    return { chapterId: entries[0][0], ...entries[0][1] };
  },

  // Streak tracking
  updateStreak() {
    const today = new Date().toDateString();
    const streakData = storage.get('reading_streak', { count: 0, lastDate: null });
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (streakData.lastDate === today) return; // Already counted today
    if (streakData.lastDate === yesterday) {
      streakData.count++;
    } else if (streakData.lastDate !== today) {
      streakData.count = 1; // Streak broken, restart
    }
    streakData.lastDate = today;
    storage.set('reading_streak', streakData);
  },

  getStreak() { return storage.get('reading_streak', { count: 0, lastDate: null }); }
};

window.VB.progress = progress;

// ── FAVORITES ─────────────────────────────────────────────
const favorites = {
  getAll() { return storage.get('favorites', []); },

  toggle(chapterId) {
    const favs = this.getAll();
    const idx = favs.indexOf(chapterId);
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(chapterId);
    }
    storage.set('favorites', favs);
    return idx === -1; // true if added
  },

  isFavorite(chapterId) {
    return this.getAll().includes(chapterId);
  }
};

window.VB.favorites = favorites;

// ── BOOKMARKS ─────────────────────────────────────────────
const bookmarks = {
  getAll() { return storage.get('bookmarks', {}); },

  set(chapterId, page) {
    const bks = this.getAll();
    bks[chapterId] = { page, timestamp: Date.now() };
    storage.set('bookmarks', bks);
  },

  get(chapterId) {
    return this.getAll()[chapterId] || null;
  }
};

window.VB.bookmarks = bookmarks;

// ── TOAST NOTIFICATIONS ───────────────────────────────────
function showToast(message, type = '', duration = 2500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type ? 'toast-' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.VB.toast = showToast;

// ── DATE FORMATTING ───────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
}

window.VB.formatDate = formatDate;
window.VB.timeAgo = timeAgo;

// ── READING TIME ESTIMATE ─────────────────────────────────
function estimateReadTime(pages) {
  const mins = Math.ceil(pages * 0.5); // ~30 sec per page
  return mins < 60 ? `${mins} min read` : `${Math.floor(mins/60)}h ${mins%60}m`;
}

window.VB.estimateReadTime = estimateReadTime;

// ── COUNTDOWN TIMER ───────────────────────────────────────
function startCountdown(targetDate, elDays, elHours, elMins, elSecs) {
  function tick() {
    const diff = new Date(targetDate) - Date.now();
    if (diff <= 0) {
      [elDays, elHours, elMins, elSecs].forEach(el => { if (el) el.textContent = '00'; });
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (elDays) elDays.textContent = String(d).padStart(2, '0');
    if (elHours) elHours.textContent = String(h).padStart(2, '0');
    if (elMins) elMins.textContent = String(m).padStart(2, '0');
    if (elSecs) elSecs.textContent = String(s).padStart(2, '0');
  }
  tick();
  return setInterval(tick, 1000);
}

window.VB.startCountdown = startCountdown;

// ── SHARE ─────────────────────────────────────────────────
async function shareChapter(chapterTitle, chapterNum) {
  const url = window.location.href;
  const text = `Reading VOIDBORN Chapter ${chapterNum}: "${chapterTitle}"`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'VOIDBORN', text, url });
      return;
    } catch {}
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    showToast('📋 Link copied to clipboard!');
  } catch {
    showToast('Share: ' + url);
  }
}

window.VB.shareChapter = shareChapter;

// ── NAVBAR BEHAVIOR ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Set active nav link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });

    // Close on nav click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('mobile-open'));
    });
  }

  // Announcement banner dismiss
  const banner = document.getElementById('announcement-banner');
  const bannerClose = document.querySelector('.banner-close');
  if (banner && bannerClose) {
    const dismissed = storage.get('banner_dismissed');
    if (dismissed) banner.remove();

    bannerClose.addEventListener('click', () => {
      banner.style.transition = '300ms ease';
      banner.style.maxHeight = banner.offsetHeight + 'px';
      requestAnimationFrame(() => {
        banner.style.maxHeight = '0';
        banner.style.overflow = 'hidden';
        banner.style.padding = '0';
      });
      setTimeout(() => banner.remove(), 300);
      storage.set('banner_dismissed', true);
    });
  }

  // FAQ accordion (if present)
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
});
