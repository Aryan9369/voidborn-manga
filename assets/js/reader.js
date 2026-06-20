/**
 * VOIDBORN — READER
 * Vertical scroll + paged mode, keyboard nav, progress tracking,
 * zoom, bookmarks, fullscreen, auto-hide bars
 */

document.addEventListener('DOMContentLoaded', async () => {
  const { fetchData, storage, progress, bookmarks, toast, shareChapter } = window.VB;

  // ── PARSE URL PARAMS ────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const chapterSlug = params.get('chapter') || '';
  const startPage = parseInt(params.get('page')) || 1;

  // ── LOAD DATA ───────────────────────────────────────────
  const [chapters] = await Promise.all([fetchData('data/chapters.json')]);
  if (!chapters) return;

  const chapter = chapters.find(c => c.slug === chapterSlug) || chapters[0];
  if (!chapter) return;

  // ── STATE ───────────────────────────────────────────────
  let readMode = storage.get('reader_mode', 'vertical'); // 'vertical' | 'page'
  let zoom = storage.get('reader_zoom', 100);
  let currentPage = 1;
  let barsVisible = true;
  let barsTimer = null;
  let isFullscreen = false;

  const pages = chapter.pageImages || [];
  const totalPages = pages.length;

  // ── DOM REFS ────────────────────────────────────────────
  const topbar = document.getElementById('reader-topbar');
  const bottombar = document.getElementById('reader-bottombar');
  const readerContent = document.getElementById('reader-content');
  const progressBar = document.getElementById('reading-progress-bar');
  const chapterSelector = document.getElementById('chapter-selector');
  const chapterEnd = document.getElementById('chapter-end');
  const shortcutsOverlay = document.getElementById('shortcuts-overlay');

  // ── INIT PAGE TITLE ─────────────────────────────────────
  document.title = `Ch.${chapter.number}: ${chapter.title} — VOIDBORN`;

  // Topbar
  const topbarNum = document.querySelector('.topbar-chapter-num');
  const topbarTitle = document.querySelector('.topbar-chapter-title');
  if (topbarNum) topbarNum.textContent = `Chapter ${chapter.number}`;
  if (topbarTitle) topbarTitle.textContent = chapter.title;

  // ── CHAPTER SELECTOR ────────────────────────────────────
  if (chapterSelector) {
    const sorted = [...chapters].sort((a, b) => a.number - b.number);
    chapterSelector.innerHTML = sorted.map(ch =>
      `<option value="${ch.slug}" ${ch.slug === chapter.slug ? 'selected' : ''}>
        Chapter ${ch.number}: ${ch.title}
      </option>`
    ).join('');

    chapterSelector.addEventListener('change', () => {
      window.location.href = `reader.html?chapter=${chapterSelector.value}`;
    });
  }

  // ── RENDER PAGES ────────────────────────────────────────
  function renderPages() {
    readerContent.innerHTML = '';
    readerContent.className = `mode-${readMode}`;
    readerContent.setAttribute('data-zoom', zoom);

    pages.forEach((src, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'page-wrapper';
      wrapper.dataset.page = i + 1;
      if (readMode === 'page' && i + 1 === currentPage) wrapper.classList.add('current-page');

      const img = document.createElement('img');
      img.className = 'page-img';
      img.loading = 'lazy';
      img.alt = `Page ${i + 1}`;
      img.width = 800;
      img.height = 1200;

      // Intersection observer for lazy load
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.disconnect();
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(wrapper);

      wrapper.appendChild(img);
      readerContent.appendChild(wrapper);
    });

    // Chapter end card
    readerContent.appendChild(chapterEnd);
    updatePageCounter();
    if (readMode === 'vertical') updateProgressFromScroll();
  }

  // ── PROGRESS BAR (vertical mode) ─────────────────────────
  function updateProgressFromScroll() {
    if (readMode !== 'vertical') return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';

    // Detect current page based on scroll
    const wrappers = readerContent.querySelectorAll('.page-wrapper[data-page]');
    let newPage = currentPage;
    wrappers.forEach(w => {
      const rect = w.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.5 && rect.bottom > 0) {
        newPage = parseInt(w.dataset.page);
      }
    });

    if (newPage !== currentPage) {
      currentPage = newPage;
      updatePageCounter();
      saveProgress();
    }
  }

  // ── PAGE MODE NAVIGATION ──────────────────────────────────
  function goToPage(n) {
    if (n < 1 || n > totalPages) return;
    currentPage = n;

    if (readMode === 'page') {
      readerContent.querySelectorAll('.page-wrapper').forEach((w, i) => {
        w.classList.toggle('current-page', i + 1 === currentPage);
      });
      if (progressBar) progressBar.style.width = `${(currentPage / totalPages) * 100}%`;
    }

    updatePageCounter();
    saveProgress();
    window.scrollTo({ top: 0, behavior: readMode === 'page' ? 'instant' : 'smooth' });
  }

  function updatePageCounter() {
    const counter = document.getElementById('page-counter');
    if (counter) counter.textContent = `${currentPage} / ${totalPages}`;

    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
  }

  // ── CHAPTER NAVIGATION ────────────────────────────────────
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  const chIdx = sorted.findIndex(c => c.slug === chapter.slug);
  const prevChapter = chIdx > 0 ? sorted[chIdx - 1] : null;
  const nextChapter = chIdx < sorted.length - 1 ? sorted[chIdx + 1] : null;

  const prevChBtn = document.getElementById('prev-chapter-btn');
  const nextChBtn = document.getElementById('next-chapter-btn');
  const nextChBtnEnd = document.getElementById('next-chapter-btn-end');

  if (prevChBtn) {
    if (prevChapter) {
      prevChBtn.onclick = () => window.location.href = `reader.html?chapter=${prevChapter.slug}`;
    } else {
      prevChBtn.disabled = true;
    }
  }

  function goNextChapter() {
    if (nextChapter) window.location.href = `reader.html?chapter=${nextChapter.slug}`;
  }

  if (nextChBtn) {
    if (nextChapter) nextChBtn.onclick = goNextChapter;
    else nextChBtn.disabled = true;
  }

  if (nextChBtnEnd) {
    if (nextChapter) {
      nextChBtnEnd.textContent = `Chapter ${nextChapter.number}: ${nextChapter.title} →`;
      nextChBtnEnd.onclick = goNextChapter;
    } else {
      nextChBtnEnd.textContent = 'Back to Chapters';
      nextChBtnEnd.onclick = () => window.location.href = 'chapters.html';
    }
  }

  // ── SAVE PROGRESS ─────────────────────────────────────────
  function saveProgress() {
    progress.save(chapter.id, currentPage, totalPages);
  }

  // ── READ MODE TOGGLE ─────────────────────────────────────
  const modeBtn = document.getElementById('mode-toggle-btn');
  if (modeBtn) {
    updateModeBtn();
    modeBtn.addEventListener('click', () => {
      readMode = readMode === 'vertical' ? 'page' : 'vertical';
      storage.set('reader_mode', readMode);
      updateModeBtn();
      renderPages();
      if (readMode === 'page') goToPage(currentPage);
    });
  }

  function updateModeBtn() {
    if (!modeBtn) return;
    modeBtn.title = readMode === 'vertical' ? 'Switch to page mode' : 'Switch to scroll mode';
    modeBtn.innerHTML = readMode === 'vertical'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
  }

  // ── ZOOM ──────────────────────────────────────────────────
  const zoomIn = document.getElementById('zoom-in-btn');
  const zoomOut = document.getElementById('zoom-out-btn');
  const zoomLabel = document.getElementById('zoom-label');

  function setZoom(z) {
    zoom = Math.max(70, Math.min(130, z));
    storage.set('reader_zoom', zoom);
    readerContent.setAttribute('data-zoom', zoom);
    if (zoomLabel) zoomLabel.textContent = zoom + '%';
  }

  if (zoomIn) zoomIn.addEventListener('click', () => setZoom(zoom + 10));
  if (zoomOut) zoomOut.addEventListener('click', () => setZoom(zoom - 10));
  if (zoomLabel) zoomLabel.textContent = zoom + '%';

  // ── BOOKMARK ──────────────────────────────────────────────
  const bookmarkBtn = document.getElementById('bookmark-btn');
  if (bookmarkBtn) {
    const existingBm = bookmarks.get(chapter.id);
    bookmarkBtn.classList.toggle('active', !!existingBm);

    bookmarkBtn.addEventListener('click', () => {
      bookmarks.set(chapter.id, currentPage);
      bookmarkBtn.classList.add('active');
      toast(`🔖 Bookmarked page ${currentPage}`);
    });
  }

  // ── SHARE ─────────────────────────────────────────────────
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => shareChapter(chapter.title, chapter.number));
  }

  // ── FULLSCREEN ────────────────────────────────────────────
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!isFullscreen) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
      fullscreenBtn.classList.toggle('active', isFullscreen);
    });
  }

  // ── AUTO-HIDE BARS ────────────────────────────────────────
  function showBars() {
    barsVisible = true;
    topbar?.classList.remove('hidden-bar');
    bottombar?.classList.remove('hidden-bar');
    resetBarsTimer();
  }

  function hideBars() {
    barsVisible = false;
    topbar?.classList.add('hidden-bar');
    bottombar?.classList.add('hidden-bar');
  }

  function resetBarsTimer() {
    clearTimeout(barsTimer);
    barsTimer = setTimeout(hideBars, 3000);
  }

  document.addEventListener('mousemove', showBars, { passive: true });
  document.addEventListener('touchstart', showBars, { passive: true });
  document.addEventListener('click', () => {
    if (!barsVisible) { showBars(); return; }
    resetBarsTimer();
  });

  resetBarsTimer();

  // ── KEYBOARD NAVIGATION ───────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'd':
        if (readMode === 'page') goToPage(currentPage + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'a':
        if (readMode === 'page') goToPage(currentPage - 1);
        break;
      case 'f':
        fullscreenBtn?.click();
        break;
      case 'b':
        bookmarkBtn?.click();
        break;
      case 'm':
        modeBtn?.click();
        break;
      case '+':
      case '=':
        setZoom(zoom + 10);
        break;
      case '-':
        setZoom(zoom - 10);
        break;
      case '?':
        shortcutsOverlay?.classList.toggle('hidden');
        break;
      case 'Escape':
        shortcutsOverlay?.classList.add('hidden');
        if (document.fullscreenElement) document.exitFullscreen();
        break;
    }

    showBars();
  });

  // ── PAGE NAV BUTTONS ─────────────────────────────────────
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));

  // ── SHORTCUTS MODAL ───────────────────────────────────────
  const shortcutsBtn = document.getElementById('shortcuts-btn');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => shortcutsOverlay?.classList.toggle('hidden'));
  }
  if (shortcutsOverlay) {
    shortcutsOverlay.addEventListener('click', (e) => {
      if (e.target === shortcutsOverlay) shortcutsOverlay.classList.add('hidden');
    });
  }

  // ── SCROLL LISTENER (vertical mode) ──────────────────────
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        if (readMode === 'vertical') updateProgressFromScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // ── INITIAL RENDER ────────────────────────────────────────
  currentPage = Math.min(startPage, totalPages || 1);
  renderPages();

  // Start page: scroll to position in vertical mode
  if (readMode === 'vertical' && startPage > 1) {
    setTimeout(() => {
      const targetWrapper = readerContent.querySelector(`[data-page="${startPage}"]`);
      if (targetWrapper) targetWrapper.scrollIntoView({ behavior: 'instant' });
    }, 300);
  }

  setZoom(zoom);
  saveProgress();
});
