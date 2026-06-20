/**
 * VOIDBORN — ABOUT PAGE
 * Story overview, world-building, author notes, FAQ
 */

document.addEventListener('DOMContentLoaded', async () => {
  const { fetchData, formatDate } = window.VB;

  const [manga, chapters] = await Promise.all([
    fetchData('data/manga.json'),
    fetchData('data/chapters.json')
  ]);

  if (!manga) return;

  // ── META INFO ─────────────────────────────────────────
  const aboutTitle = document.getElementById('about-manga-title');
  if (aboutTitle) aboutTitle.textContent = manga.title;

  const overviewTitle = document.getElementById('overview-title');
  if (overviewTitle) overviewTitle.textContent = manga.title;

  const overviewSynopsis = document.getElementById('overview-synopsis');
  if (overviewSynopsis) overviewSynopsis.textContent = manga.synopsis;

  const overviewCover = document.getElementById('overview-cover');
  if (overviewCover) { overviewCover.src = manga.cover; overviewCover.alt = manga.title; }

  // Stats
  if (chapters) {
    const totalPages = chapters.reduce((s, c) => s + c.pages, 0);
    const elChapters = document.getElementById('meta-chapters');
    const elPages = document.getElementById('meta-pages');
    if (elChapters) elChapters.textContent = chapters.length;
    if (elPages) elPages.textContent = totalPages;
  }

  const elStatus = document.getElementById('meta-status');
  const elSchedule = document.getElementById('meta-schedule');
  if (elStatus) elStatus.textContent = manga.status;
  if (elSchedule) elSchedule.textContent = manga.updateSchedule;

  // ── GENRE TAGS ─────────────────────────────────────────
  const genreContainer = document.getElementById('genre-tags');
  if (genreContainer && manga.genre) {
    genreContainer.innerHTML = manga.genre.map(g =>
      `<span class="genre-tag">${g}</span>`
    ).join('');
  }

  // ── WORLD BUILDING ─────────────────────────────────────
  const worldGrid = document.getElementById('world-grid');
  if (worldGrid && manga.worldBuilding) {
    worldGrid.innerHTML = manga.worldBuilding.map(item => `
      <div class="world-card">
        <div class="world-term">${item.term}</div>
        <div class="world-def">${item.definition}</div>
      </div>
    `).join('');
  }

  // ── AUTHOR NOTES ─────────────────────────────────────────
  if (manga.author) {
    const a = manga.author;
    const elAvatar = document.getElementById('note-author-avatar');
    const elName = document.getElementById('note-author-name');
    const elHandle = document.getElementById('note-author-handle');
    const elBio = document.getElementById('note-author-bio');

    if (elAvatar) { elAvatar.src = a.avatar; elAvatar.alt = a.name; }
    if (elName) elName.textContent = a.name;
    if (elHandle) elHandle.textContent = a.handle;
    if (elBio) elBio.textContent = a.bio;
  }

  // ── FAQ ───────────────────────────────────────────────────
  const faqList = document.getElementById('faq-list');
  if (faqList && manga.faq) {
    faqList.innerHTML = manga.faq.map((item, i) => `
      <div class="faq-item">
        <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${i}">
          ${item.q}
          <span class="faq-icon" aria-hidden="true">+</span>
        </button>
        <div class="faq-answer" id="faq-answer-${i}" role="region">
          <div class="faq-answer-inner">${item.a}</div>
        </div>
      </div>
    `).join('');

    // FAQ accordion interaction (re-bind since DOM was just built)
    faqList.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        faqList.querySelectorAll('.faq-item.open').forEach(i => {
          i.classList.remove('open');
          i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }
});
